<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'device_uuid')) {
                $table->uuid('device_uuid')->nullable()->after('name');
            }

            if (! Schema::hasColumn('users', 'avatar_color')) {
                $table->string('avatar_color', 20)->nullable()->after('device_uuid');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'avatar_color')) {
                $table->dropColumn('avatar_color');
            }

            if (Schema::hasColumn('users', 'device_uuid')) {
                $table->dropColumn('device_uuid');
            }
        });
    }
};
