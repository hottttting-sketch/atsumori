import { NextResponse } from 'next/server';
import { getSheetData, appendSheetData } from '@/lib/googleSheets';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agency = searchParams.get('agency') || '電通見積'; // '電通見積' | '博報堂見積' | 'アザー見積'
  
  try {
    const data = await getSheetData(agency);
    return NextResponse.json({ data });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agency, data } = body;
    
    if (!agency || !data) {
      return NextResponse.json({ error: 'Missing agency or data' }, { status: 400 });
    }
    
    await appendSheetData(agency, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to append estimate' }, { status: 500 });
  }
}
