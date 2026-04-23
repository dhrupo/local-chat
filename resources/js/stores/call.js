import { defineStore } from "pinia";

const turnUrls = (import.meta.env.VITE_TURN_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const ICE_SERVERS = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        ...(turnUrls.length
            ? [{
                  urls: turnUrls,
                  username: import.meta.env.VITE_TURN_USERNAME || undefined,
                  credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
              }]
            : []),
    ],
};

export const hasTurnServer = () => turnUrls.length > 0;

let participantChannelName = null;

const isLocalhost = () => ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

const encodeBase64 = (value) => {
    const bytes = new TextEncoder().encode(value);
    let binary = "";

    for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }

    return window.btoa(binary);
};

const decodeBase64 = (value) => {
    const binary = window.atob(value);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return new TextDecoder().decode(bytes);
};

const normalizeSdp = (sdp) => {
    if (typeof sdp !== "string") {
        return "";
    }

    const normalized = sdp.replace(/\r?\n/g, "\r\n");

    return normalized.endsWith("\r\n") ? normalized : `${normalized}\r\n`;
};

const serializeSessionDescription = (description) => ({
    type: description.type,
    sdp_base64: encodeBase64(description.sdp),
});

const deserializeSessionDescription = (description) => {
    if (!description?.type) {
        throw new Error("Missing WebRTC session description type.");
    }

    const sdp = description.sdp_base64
        ? decodeBase64(description.sdp_base64)
        : description.sdp;

    return {
        type: description.type,
        sdp: normalizeSdp(sdp),
    };
};

const serializeIceCandidate = (candidate) => ({
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
});

const normalizeMediaError = (error, mode) => {
    if (!window.isSecureContext && !isLocalhost()) {
        return `${mode === "video" ? "Video" : "Voice"} calling requires HTTPS or localhost. Plain LAN HTTP URLs cannot access the microphone/camera in most browsers.`;
    }

    if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        return `Microphone${mode === "video" ? " and camera" : ""} permission was denied.`;
    }

    if (error?.name === "NotFoundError" || error?.name === "DevicesNotFoundError") {
        return `${mode === "video" ? "Camera or microphone" : "Microphone"} was not found on this device.`;
    }

    if (error?.name === "NotReadableError" || error?.name === "TrackStartError") {
        return `${mode === "video" ? "Camera or microphone" : "Microphone"} is already in use by another app or browser tab.`;
    }

    return error?.message || `Unable to start the ${mode} call.`;
};

export const useCallStore = defineStore("call", {
    state: () => ({
        incomingCall: null,
        activeCall: null,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
        pendingIceCandidates: [],
        subscribedParticipantId: null,
        initializing: false,
    }),
    actions: {
        startRealtime(participantId) {
            this.stopRealtime();

            if (!participantId) {
                return;
            }

            participantChannelName = `participant.${participantId}`;
            this.subscribedParticipantId = participantId;

            window.Echo.private(participantChannelName).listen(".call.signal", (event) => {
                this.handleSignal(event);
            });
        },
        stopRealtime() {
            if (participantChannelName) {
                window.Echo.leave(participantChannelName);
            }

            participantChannelName = null;
            this.subscribedParticipantId = null;
            this.cleanup();
        },
        async startCall(participant, mode = "video", roomId = null) {
            if (!participant?.id) {
                return;
            }

            await this.cleanup();
            this.initializing = true;

            try {
                const localStream = await this.requestMedia(mode);
                const connection = this.createPeerConnection(participant, mode, roomId);

                localStream.getTracks().forEach((track) => {
                    connection.addTrack(track, localStream);
                });

                this.localStream = localStream;
                this.activeCall = {
                    participant,
                    mode,
                    roomId,
                    status: "calling",
                    direction: "outgoing",
                };

                const offer = await connection.createOffer();
                await connection.setLocalDescription(offer);

                await this.sendSignal(participant.id, "offer", {
                    description: serializeSessionDescription(connection.localDescription || offer),
                    mode,
                }, roomId);

                this.activeCall = {
                    ...this.activeCall,
                    status: "ringing",
                };
            } catch (error) {
                await this.cleanup();
                throw error;
            } finally {
                this.initializing = false;
            }
        },
        async answerIncomingCall() {
            if (!this.incomingCall) {
                return;
            }

            const { from, mode, roomId, payload } = this.incomingCall;
            this.initializing = true;

            try {
                await this.cleanup(false);
                const localStream = await this.requestMedia(mode);
                const connection = this.createPeerConnection(from, mode, roomId);

                localStream.getTracks().forEach((track) => {
                    connection.addTrack(track, localStream);
                });

                this.localStream = localStream;
                this.activeCall = {
                    participant: from,
                    mode,
                    roomId,
                    status: "connecting",
                    direction: "incoming",
                };

                await this.applyRemoteDescription(connection, payload.description);

                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                await this.sendSignal(from.id, "answer", {
                    description: serializeSessionDescription(connection.localDescription || answer),
                    mode,
                }, roomId);

                this.incomingCall = null;
            } catch (error) {
                await this.cleanup(false);
                throw error;
            } finally {
                this.initializing = false;
            }
        },
        async rejectIncomingCall() {
            if (!this.incomingCall?.from?.id) {
                return;
            }

            await this.sendSignal(
                this.incomingCall.from.id,
                "reject-call",
                { mode: this.incomingCall.mode },
                this.incomingCall.roomId
            );

            this.incomingCall = null;
            await this.cleanup();
        },
        async endCall() {
            if (this.activeCall?.participant?.id) {
                await this.sendSignal(
                    this.activeCall.participant.id,
                    "end-call",
                    { mode: this.activeCall.mode },
                    this.activeCall.roomId
                );
            }

            await this.cleanup();
        },
        async handleSignal(event) {
            const signalType = event.signal_type;

            if (signalType === "offer") {
                await this.cleanup(false);
                this.incomingCall = {
                    from: event.from,
                    mode: event.payload?.mode || "video",
                    roomId: event.room_id || null,
                    payload: event.payload || {},
                    status: "ringing",
                };
                return;
            }

            if (signalType === "answer") {
                if (!this.peerConnection || !event.payload?.description) {
                    return;
                }

                await this.applyRemoteDescription(this.peerConnection, event.payload.description);
                this.activeCall = this.activeCall
                    ? {
                          ...this.activeCall,
                          status: "connected",
                      }
                    : null;
                return;
            }

            if (signalType === "ice-candidate") {
                if (!event.payload?.candidate) {
                    return;
                }

                try {
                    await this.addIceCandidate(event.payload.candidate);
                } catch (error) {
                    console.error("Unable to add ICE candidate", error);
                }

                return;
            }

            if (signalType === "reject-call" || signalType === "end-call") {
                this.incomingCall = null;
                await this.cleanup();
            }
        },
        async sendSignal(toParticipantId, signalType, payload = null, roomId = null) {
            await window.axios.post("/api/calls/signal", {
                to_participant_id: toParticipantId,
                signal_type: signalType,
                payload,
                room_id: roomId,
            });
        },
        async requestMedia(mode) {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error(
                    `${mode === "video" ? "Video" : "Voice"} calling is not available in this browser or on this page.`
                );
            }

            try {
                return await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: mode === "video",
                });
            } catch (error) {
                throw new Error(normalizeMediaError(error, mode));
            }
        },
        createPeerConnection(participant, mode, roomId) {
            const connection = new RTCPeerConnection(ICE_SERVERS);
            let remoteStream = new MediaStream();

            connection.ontrack = (event) => {
                const tracks = event.streams[0]?.getTracks?.().length
                    ? event.streams[0].getTracks()
                    : [event.track];

                tracks.filter(Boolean).forEach((track) => {
                    if (remoteStream.getTrackById(track.id)) {
                        return;
                    }

                    remoteStream.addTrack(track);
                });

                remoteStream = new MediaStream(remoteStream.getTracks());
                this.remoteStream = remoteStream;
            };

            connection.onicecandidate = async (event) => {
                if (!event.candidate || !participant?.id) {
                    return;
                }

                await this.sendSignal(participant.id, "ice-candidate", {
                    candidate: serializeIceCandidate(event.candidate),
                    mode,
                }, roomId);
            };

            connection.onconnectionstatechange = () => {
                if (!this.activeCall) {
                    return;
                }

                const statusMap = {
                    connected: "connected",
                    connecting: "connecting",
                    disconnected: "disconnected",
                    failed: "failed",
                    closed: "ended",
                };

                this.activeCall = {
                    ...this.activeCall,
                    status: statusMap[connection.connectionState] || this.activeCall.status,
                };

                if (["disconnected", "failed", "closed"].includes(connection.connectionState)) {
                    this.cleanup();
                }
            };

            this.peerConnection = connection;

            return connection;
        },
        async applyRemoteDescription(connection, description) {
            await connection.setRemoteDescription(deserializeSessionDescription(description));
            await this.flushPendingIceCandidates();
        },
        async addIceCandidate(candidate) {
            if (!this.peerConnection) {
                this.pendingIceCandidates.push(candidate);
                return;
            }

            if (!this.peerConnection.remoteDescription) {
                this.pendingIceCandidates.push(candidate);
                return;
            }

            await this.peerConnection.addIceCandidate(candidate);
        },
        async flushPendingIceCandidates() {
            if (!this.peerConnection?.remoteDescription || !this.pendingIceCandidates.length) {
                return;
            }

            const candidates = [...this.pendingIceCandidates];
            this.pendingIceCandidates = [];

            for (const candidate of candidates) {
                await this.peerConnection.addIceCandidate(candidate);
            }
        },
        async cleanup(resetIncoming = true) {
            if (this.peerConnection) {
                this.peerConnection.onicecandidate = null;
                this.peerConnection.ontrack = null;
                this.peerConnection.onconnectionstatechange = null;
                this.peerConnection.close();
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach((track) => track.stop());
            }

            if (this.remoteStream) {
                this.remoteStream.getTracks().forEach((track) => track.stop());
            }

            this.peerConnection = null;
            this.localStream = null;
            this.remoteStream = null;
            this.pendingIceCandidates = [];
            this.activeCall = null;

            if (resetIncoming) {
                this.incomingCall = null;
            }
        },
    },
});
