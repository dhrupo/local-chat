<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->boolean('is_direct')->default(false)->after('description');
            $table->string('direct_key')->nullable()->unique()->after('is_direct');
        });
    }

    public function down(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropUnique(['direct_key']);
            $table->dropColumn(['is_direct', 'direct_key']);
        });
    }
};
