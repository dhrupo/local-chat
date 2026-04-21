<?php

namespace App\Http\Requests\Call;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SignalCallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'to_participant_id' => [
                'required',
                'integer',
                'exists:users,id',
                Rule::notIn([$this->user()?->id]),
            ],
            'signal_type' => [
                'required',
                'string',
                Rule::in(['offer', 'answer', 'ice-candidate', 'reject-call', 'end-call']),
            ],
            'payload' => ['nullable', 'array'],
            'room_id' => ['nullable', 'integer', 'exists:chat_rooms,id'],
        ];
    }
}
