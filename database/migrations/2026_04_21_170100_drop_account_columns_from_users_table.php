<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')
            ->whereNull('device_uuid')
            ->orderBy('id')
            ->get()
            ->each(function ($user) {
                DB::table('users')
                    ->where('id', $user->id)
                    ->update([
                        'device_uuid' => (string) Str::uuid(),
                        'avatar_color' => $user->avatar_color ?: collect(['sunset', 'lagoon', 'forest', 'ember', 'violet', 'sand'])->random(),
                    ]);
            });

        if (! $this->hasIndex('users', 'users_device_uuid_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('device_uuid');
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'email_verified_at')) {
                $table->dropColumn('email_verified_at');
            }

            if (Schema::hasColumn('users', 'email')) {
                $table->dropColumn('email');
            }

            if (Schema::hasColumn('users', 'password')) {
                $table->dropColumn('password');
            }

            if (Schema::hasColumn('users', 'remember_token')) {
                $table->dropColumn('remember_token');
            }

            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'email')) {
                $table->string('email')->nullable()->unique();
            }

            if (! Schema::hasColumn('users', 'email_verified_at')) {
                $table->timestamp('email_verified_at')->nullable();
            }

            if (! Schema::hasColumn('users', 'password')) {
                $table->string('password')->nullable();
            }

            if (! Schema::hasColumn('users', 'remember_token')) {
                $table->rememberToken();
            }

            if (! Schema::hasColumn('users', 'role')) {
                $table->tinyInteger('role')->nullable();
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if ($this->hasIndex('users', 'users_device_uuid_unique')) {
                $table->dropUnique('users_device_uuid_unique');
            }
        });
    }

    protected function hasIndex(string $table, string $index): bool
    {
        $database = DB::getDatabaseName();
        $result = DB::selectOne(
            'select count(*) as aggregate from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ?',
            [$database, $table, $index]
        );

        return (int) ($result->aggregate ?? 0) > 0;
    }
};
