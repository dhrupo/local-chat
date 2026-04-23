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
            'display_name' => [
                'required',
                'string',
                'min:2',
                'max:60',
                Rule::unique('users', 'name')->ignore(
                    optional($this->existingDevice())->id
                ),
            ],
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

    public function messages(): array
    {
        return [
            'display_name.unique' => 'This display name is already taken. Please choose a new one.',
        ];
    }

    protected function existingDevice()
    {
        return \App\Models\User::query()
            ->where('device_uuid', $this->input('device_uuid'))
            ->first();
    }
}
