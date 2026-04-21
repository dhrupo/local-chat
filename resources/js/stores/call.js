import { defineStore } from "pinia";

const ICE_SERVERS = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

let participantChannelName = null;

export const useCallStore = defineStore("call", {
    state: () => ({
        incomingCall: null,
        activeCall: null,
        localStream: null,
        remoteStream: null,
        peerConnection: null,
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
                    description: connection.localDescription?.toJSON?.() || offer,
                    mode,
                }, roomId);

                this.activeCall = {
                    ...this.activeCall,
                    status: "ringing",
                };
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

                await connection.setRemoteDescription(payload.description);

                const answer = await connection.createAnswer();
                await connection.setLocalDescription(answer);

                await this.sendSignal(from.id, "answer", {
                    description: connection.localDescription?.toJSON?.() || answer,
                    mode,
                }, roomId);

                this.incomingCall = null;
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

                await this.peerConnection.setRemoteDescription(event.payload.description);
                this.activeCall = this.activeCall
                    ? {
                          ...this.activeCall,
                          status: "connected",
                      }
                    : null;
                return;
            }

            if (signalType === "ice-candidate") {
                if (!this.peerConnection || !event.payload?.candidate) {
                    return;
                }

                try {
                    await this.peerConnection.addIceCandidate(event.payload.candidate);
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
            return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: mode === "video",
            });
        },
        createPeerConnection(participant, mode, roomId) {
            const connection = new RTCPeerConnection(ICE_SERVERS);
            const remoteStream = new MediaStream();

            connection.ontrack = (event) => {
                event.streams[0]?.getTracks().forEach((track) => {
                    remoteStream.addTrack(track);
                });

                this.remoteStream = remoteStream;
            };

            connection.onicecandidate = async (event) => {
                if (!event.candidate || !participant?.id) {
                    return;
                }

                await this.sendSignal(participant.id, "ice-candidate", {
                    candidate: event.candidate.toJSON?.() || event.candidate,
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
            this.remoteStream = remoteStream;

            return connection;
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
            this.activeCall = null;

            if (resetIncoming) {
                this.incomingCall = null;
            }
        },
    },
});
