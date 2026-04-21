<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->string('type', 20)->default('text')->after('user_id');
            $table->string('file_name')->nullable()->after('body');
            $table->string('file_path')->nullable()->after('file_name');
            $table->string('file_mime_type')->nullable()->after('file_path');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_mime_type');
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table) {
            $table->dropColumn([
                'type',
                'file_name',
                'file_path',
                'file_mime_type',
                'file_size',
            ]);
        });
    }
};
