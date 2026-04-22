import PDFDocument from 'pdfkit';
import { EventPlan, PlanVendor } from '@prisma/client';

type PlanWithVendors = EventPlan & { vendors: PlanVendor[] };

// ─── Color Palette ───────────────────────────────────────────────────────────

const COLORS = {
  primary: '#1a1a2e',
  accent: '#6c63ff',
  muted: '#6b7280',
  light: '#f3f4f6',
  white: '#ffffff',
  black: '#111827',
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addPageIfNeeded(doc: PDFKit.PDFDocument, requiredSpace: number): void {
  if (doc.y + requiredSpace > doc.page.height - 72) {
    doc.addPage();
  }
}

function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ─── Generate PDF ────────────────────────────────────────────────────────────

export async function generatePlanPdf(plan: PlanWithVendors): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: plan.title,
        Author: 'Fentsi - AI Event Planner',
        Subject: `Event Plan: ${plan.title}`,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Title Page ─────────────────────────────────────────────────────────

    doc.moveDown(4);

    doc
      .fontSize(10)
      .fillColor(COLORS.accent)
      .text('FENTSI', { align: 'center' });

    doc.moveDown(0.5);

    doc
      .fontSize(28)
      .fillColor(COLORS.primary)
      .text(plan.title, { align: 'center' });

    doc.moveDown(1);

    doc
      .fontSize(12)
      .fillColor(COLORS.muted)
      .text(
        [
          `Event Type: ${plan.event_type}`,
          `Date: ${plan.event_date}`,
          `Location: ${plan.location_city}`,
          `Guests: ${plan.guest_count}`,
          `Budget: ${formatCurrency(plan.budget_total as unknown as number)}`,
        ].join('  |  '),
        { align: 'center' },
      );

    doc.moveDown(2);

    // Divider
    doc
      .strokeColor(COLORS.accent)
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();

    doc.moveDown(1.5);

    // ── AI Summary ─────────────────────────────────────────────────────────

    doc
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text('Event Overview');

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .fillColor(COLORS.black)
      .text(plan.ai_summary, { lineGap: 3 });

    doc.moveDown(1);

    // ── Budget Breakdown ───────────────────────────────────────────────────

    addPageIfNeeded(doc, 200);

    doc
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text('Budget Breakdown');

    doc.moveDown(0.5);

    const breakdown = plan.budget_breakdown as Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;

    if (Array.isArray(breakdown)) {
      // Table header
      const tableLeft = 50;
      const colWidths = [200, 120, 100];
      const headerY = doc.y;

      doc
        .fontSize(9)
        .fillColor(COLORS.muted)
        .text('CATEGORY', tableLeft, headerY)
        .text('AMOUNT', tableLeft + colWidths[0], headerY)
        .text('PERCENTAGE', tableLeft + colWidths[0] + colWidths[1], headerY);

      doc.moveDown(0.3);
      doc
        .strokeColor(COLORS.light)
        .lineWidth(0.5)
        .moveTo(tableLeft, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke();

      doc.moveDown(0.3);

      for (const item of breakdown) {
        addPageIfNeeded(doc, 20);
        const rowY = doc.y;

        doc
          .fontSize(10)
          .fillColor(COLORS.black)
          .text(item.category, tableLeft, rowY)
          .text(formatCurrency(item.amount), tableLeft + colWidths[0], rowY)
          .text(`${item.percentage}%`, tableLeft + colWidths[0] + colWidths[1], rowY);

        doc.moveDown(0.6);
      }
    }

    doc.moveDown(1);

    // ── Timeline ───────────────────────────────────────────────────────────

    addPageIfNeeded(doc, 200);

    doc
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text('Event Timeline');

    doc.moveDown(0.5);

    const timeline = plan.timeline as Array<{
      time: string;
      activity: string;
      notes?: string;
    }>;

    if (Array.isArray(timeline)) {
      for (const entry of timeline) {
        addPageIfNeeded(doc, 40);

        doc
          .fontSize(10)
          .fillColor(COLORS.accent)
          .text(entry.time, 50, doc.y, { continued: true })
          .fillColor(COLORS.black)
          .text(`  ${entry.activity}`);

        if (entry.notes) {
          doc
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text(`    ${entry.notes}`);
        }

        doc.moveDown(0.4);
      }
    }

    doc.moveDown(1);

    // ── Vendor List ────────────────────────────────────────────────────────

    if (plan.vendors.length > 0) {
      addPageIfNeeded(doc, 200);

      doc
        .fontSize(16)
        .fillColor(COLORS.primary)
        .text('Recommended Vendors');

      doc.moveDown(0.5);

      for (const vendor of plan.vendors) {
        addPageIfNeeded(doc, 60);

        const score = vendor.ai_match_score;
        const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

        doc
          .fontSize(11)
          .fillColor(COLORS.black)
          .text(vendor.name, 50, doc.y, { continued: true })
          .fontSize(9)
          .fillColor(scoreColor)
          .text(`  Score: ${score}/100`);

        doc
          .fontSize(9)
          .fillColor(COLORS.muted)
          .text(
            `${vendor.vendor_type} | ${vendor.address} | ${vendor.price_range}`,
          );

        if (vendor.ai_match_reason) {
          doc
            .fontSize(9)
            .fillColor(COLORS.muted)
            .text(vendor.ai_match_reason, { indent: 0 });
        }

        if (vendor.website) {
          doc
            .fontSize(8)
            .fillColor(COLORS.accent)
            .text(vendor.website);
        }

        doc.moveDown(0.6);
      }
    }

    doc.moveDown(1);

    // ── AI Tips ────────────────────────────────────────────────────────────

    const tips = plan.ai_tips as string[];

    if (Array.isArray(tips) && tips.length > 0) {
      addPageIfNeeded(doc, 150);

      doc
        .fontSize(16)
        .fillColor(COLORS.primary)
        .text('AI Tips & Recommendations');

      doc.moveDown(0.5);

      for (const tip of tips) {
        addPageIfNeeded(doc, 30);

        doc
          .fontSize(10)
          .fillColor(COLORS.black)
          .text(`\u2022  ${tip}`, { lineGap: 2 });

        doc.moveDown(0.3);
      }
    }

    // ── Footer ─────────────────────────────────────────────────────────────

    doc.moveDown(2);
    addPageIfNeeded(doc, 40);

    doc
      .strokeColor(COLORS.light)
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();

    doc.moveDown(0.5);

    doc
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(
        `Generated by Fentsi AI Event Planner on ${new Date().toLocaleDateString('en-GB')}`,
        { align: 'center' },
      );

    doc.end();
  });
}
