import { NextResponse } from 'next/server';
import { Xendit } from 'xendit-node';
import { supabase } from '@/lib/supabase'; // Kita tetap butuh supabase untuk update status

// Ambil secret key dari Environment Variables demi keamanan
const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY || '',
});

const { Invoice } = xendit;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, amount, customerName, items, tableNumber } = body;

    if (!orderId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Buat Invoice Tagihan di Xendit
    const invoiceRequest = {
      externalId: `INV-${orderId}`,
      amount: amount,
      payerEmail: 'pelanggan@ninecoffee.local', // Bisa dikembangkan jika minta email user
      description: `Pesanan ${tableNumber} - ${customerName}`,
      // Xendit akan membuat link pembayaran yang mengarahkan user ke halaman sukses/gagal
      successRedirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?payment=success`,
      failureRedirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?payment=failed`,
      currency: 'IDR',
      items: items.map((item: string) => {
        // Parsing "1x Nama Menu"
        const match = item.match(/^(\d+)x\s+(.+)$/);
        return {
          name: match ? match[2] : item,
          quantity: match ? parseInt(match[1]) : 1,
          price: 0, // Simplified: Xendit items are optional for simple invoices, but good for display
        };
      })
    };

    const invoice = await Invoice.createInvoice({
      data: invoiceRequest
    });

    // 2. Simpan link pembayaran Xendit ke database (opsional) atau langsung kembalikan ke Frontend
    return NextResponse.json({ 
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.id 
    });

  } catch (error: any) {
    console.error('Xendit Invoice Creation Failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create payment invoice' },
      { status: 500 }
    );
  }
}
