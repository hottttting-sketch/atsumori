import { NextResponse } from 'next/server';
import { getSheetData } from '@/lib/googleSheets';

export async function GET() {
  try {
    const data = await getSheetData('受信ログ');
    // 最新のものが上に来るように逆順にする
    const reversedData = [...data].reverse();
    return NextResponse.json({ success: true, data: reversedData });
  } catch (error: any) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs', details: error.message }, { status: 500 });
  }
}
