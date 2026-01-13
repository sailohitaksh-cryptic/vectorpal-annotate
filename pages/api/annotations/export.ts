import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Get all annotations with user info
    const result = await sql`
      SELECT 
        u.email,
        a.question_number,
        a.image_a_description,
        a.image_b_description,
        a.is_completed,
        a.created_at,
        a.updated_at
      FROM annotations a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.question_number, u.email
    `;

    // Generate CSV
    const headers = [
      'user_email',
      'question_number',
      'image_a_description',
      'image_b_description',
      'is_completed',
      'created_at',
      'updated_at'
    ];

    // Helper function to escape CSV fields
    const escapeCSV = (field: any): string => {
      if (field === null || field === undefined) {
        return '';
      }
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Build CSV content
    let csvContent = headers.join(',') + '\n';

    for (const row of result.rows) {
      const csvRow = [
        escapeCSV(row.email),
        escapeCSV(row.question_number),
        escapeCSV(row.image_a_description),
        escapeCSV(row.image_b_description),
        escapeCSV(row.is_completed),
        escapeCSV(row.created_at),
        escapeCSV(row.updated_at)
      ];
      csvContent += csvRow.join(',') + '\n';
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="annotations_export_${Date.now()}.csv"`);
    
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export annotations error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
}
