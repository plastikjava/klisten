import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getKVCredentials() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

export async function POST(req: Request) {
  try {
    const { roomHash, encryptedData } = await req.json();
    if (!roomHash || !encryptedData) {
      return NextResponse.json({ error: 'Fehlende Parameter' }, { status: 400 });
    }

    const { url, token } = getKVCredentials();
    if (!url || !token) {
      return NextResponse.json(
        { error: 'Vercel KV Datenbank ist in Vercel noch nicht verbunden. Bitte erstelle eine KV-Datenbank unter Storage in Vercel.' },
        { status: 503 }
      );
    }

    const key = `klisten:sync:${roomHash}`;
    const res = await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(encryptedData),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `KV-Fehler: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomHash = searchParams.get('roomHash');
    if (!roomHash) {
      return NextResponse.json({ error: 'Fehlender Raum' }, { status: 400 });
    }

    const { url, token } = getKVCredentials();
    if (!url || !token) {
      return NextResponse.json(
        { error: 'Vercel KV Datenbank ist in Vercel noch nicht verbunden. Bitte erstelle eine KV-Datenbank unter Storage in Vercel.' },
        { status: 503 }
      );
    }

    const key = `klisten:sync:${roomHash}`;
    const res = await fetch(`${url}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ encryptedData: null });
    }

    const data = await res.json();
    const encryptedData = data.result || null;
    return NextResponse.json({ encryptedData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Serverfehler' }, { status: 500 });
  }
}
