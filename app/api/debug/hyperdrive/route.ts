import { NextResponse } from 'next/server';
import { dbQuery, getDatabaseDiagnostics } from '@/app/lib/postgres';

export async function GET() {
  const diagnostics = await getDatabaseDiagnostics();

  try {
    const result = await dbQuery<{ ok: number }>('SELECT 1 AS ok');
    return NextResponse.json({
      ok: true,
      message: 'Hyperdrive and database connection are working.',
      result: result.rows[0] || null,
      diagnostics,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error.';
    console.error('Hyperdrive debug failed:', { message, diagnostics });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        diagnostics,
      },
      { status: 500 }
    );
  }
}
