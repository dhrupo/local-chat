<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DeviceSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'device_uuid' => ['required', 'uuid', 'max:64'],
            'display_name' => ['required', 'string', 'min:2', 'max:60'],
            'avatar_color' => ['nullable', 'string', Rule::in([
                'sunset',
                'lagoon',
                'forest',
                'ember',
                'violet',
                'sand',
            ])],
        ];
    }
}
