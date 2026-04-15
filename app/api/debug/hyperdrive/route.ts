import { NextResponse } from 'next/server';
import { dbQuery } from '@/app/lib/postgres';

export async function GET() {
  try {
    const result = await dbQuery<{ ok: number }>('SELECT 1 AS ok');
    return NextResponse.json({
      ok: true,
      message: 'Hyperdrive and database connection are working.',
      result: result.rows[0] || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error.';
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
