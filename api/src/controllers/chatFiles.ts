/**
 * Chat File Upload Controller
 * Handles file uploads to Supabase Storage for chat sessions
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const STORAGE_BUCKET = 'chat-files';

interface UploadedFile {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  url: string;
}

/**
 * Upload a file to chat storage
 */
export async function uploadChatFile(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  const userId = (req as any).userId;
  const { session_id } = req.body;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const file = req.file;

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowed: ALLOWED_MIME_TYPES,
    });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ 
      error: 'File too large',
      max_size: MAX_FILE_SIZE,
    });
  }

  try {
    // Generate unique filename
    const ext = path.extname(file.originalname);
    const fileId = uuidv4();
    const storagePath = `${organizationId}/${session_id || 'pending'}/${fileId}${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[ChatFiles] Upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file', details: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('chat_files')
      .insert({
        id: fileId,
        session_id: session_id || null,
        organization_id: organizationId,
        uploaded_by: userId,
        filename: `${fileId}${ext}`,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        storage_bucket: STORAGE_BUCKET,
        storage_path: storagePath,
        status: 'uploaded',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[ChatFiles] DB error:', dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return res.status(500).json({ error: 'Failed to save file metadata' });
    }

    // Extract text content for certain file types (async, don't wait)
    extractFileContent(fileId, file.buffer, file.mimetype).catch(err => {
      console.error('[ChatFiles] Text extraction failed:', err);
    });

    const uploadedFile: UploadedFile = {
      id: fileId,
      filename: `${fileId}${ext}`,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      storage_path: storagePath,
      url: urlData.publicUrl,
    };

    return res.json({ file: uploadedFile });
  } catch (error) {
    console.error('[ChatFiles] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to upload file',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleChatFiles(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  const userId = (req as any).userId;
  const { session_id } = req.body;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files provided' });
  }

  if (files.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 files allowed' });
  }

  const results: UploadedFile[] = [];
  const errors: Array<{ filename: string; error: string }> = [];

  for (const file of files) {
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      errors.push({ filename: file.originalname, error: 'Invalid file type' });
      continue;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push({ filename: file.originalname, error: 'File too large' });
      continue;
    }

    try {
      const ext = path.extname(file.originalname);
      const fileId = uuidv4();
      const storagePath = `${organizationId}/${session_id || 'pending'}/${fileId}${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        errors.push({ filename: file.originalname, error: uploadError.message });
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Save file metadata
      const { error: dbError } = await supabase
        .from('chat_files')
        .insert({
          id: fileId,
          session_id: session_id || null,
          organization_id: organizationId,
          uploaded_by: userId,
          filename: `${fileId}${ext}`,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          file_size: file.size,
          storage_bucket: STORAGE_BUCKET,
          storage_path: storagePath,
          status: 'uploaded',
        });

      if (dbError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        errors.push({ filename: file.originalname, error: 'Failed to save metadata' });
        continue;
      }

      // Extract text (async)
      extractFileContent(fileId, file.buffer, file.mimetype).catch(() => {});

      results.push({
        id: fileId,
        filename: `${fileId}${ext}`,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        storage_path: storagePath,
        url: urlData.publicUrl,
      });
    } catch (error) {
      errors.push({ 
        filename: file.originalname, 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.json({ 
    files: results,
    errors: errors.length > 0 ? errors : undefined,
  });
}

/**
 * Link uploaded files to a chat session
 */
export async function linkFilesToSession(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  const { file_ids, session_id, message_id } = req.body;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  if (!file_ids?.length || !session_id) {
    return res.status(400).json({ error: 'file_ids and session_id required' });
  }

  const { error } = await supabase
    .from('chat_files')
    .update({ 
      session_id,
      message_id: message_id || null,
      updated_at: new Date().toISOString(),
    })
    .in('id', file_ids)
    .eq('organization_id', organizationId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true });
}

/**
 * Get files for a session
 */
export async function getSessionFiles(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  const { session_id } = req.params;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  const { data: files, error } = await supabase
    .from('chat_files')
    .select('id, filename, original_filename, mime_type, file_size, storage_path, created_at')
    .eq('session_id', session_id)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Add public URLs
  const filesWithUrls = (files || []).map(f => ({
    ...f,
    url: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(f.storage_path).data.publicUrl,
  }));

  return res.json({ files: filesWithUrls });
}

/**
 * Delete a file
 */
export async function deleteChatFile(req: Request, res: Response) {
  const organizationId = (req as any).organizationId;
  const { file_id } = req.params;

  if (!organizationId) {
    return res.status(401).json({ error: 'Organization context required' });
  }

  // Get file info
  const { data: file, error: fetchError } = await supabase
    .from('chat_files')
    .select('storage_path')
    .eq('id', file_id)
    .eq('organization_id', organizationId)
    .single();

  if (fetchError || !file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Delete from storage
  await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);

  // Delete from database
  await supabase
    .from('chat_files')
    .delete()
    .eq('id', file_id);

  return res.json({ success: true });
}

/**
 * Extract text content from files for AI context
 */
async function extractFileContent(fileId: string, buffer: Buffer, mimeType: string) {
  let extractedText: string | null = null;

  try {
    if (mimeType === 'text/plain' || mimeType === 'text/csv' || mimeType === 'application/json') {
      // Plain text files
      extractedText = buffer.toString('utf-8').slice(0, 50000); // Limit to 50k chars
    } else if (mimeType === 'application/pdf') {
      // For PDF, we'd need a library like pdf-parse
      // For now, just mark as needing extraction
      await supabase
        .from('chat_files')
        .update({ status: 'processing' })
        .eq('id', fileId);
      
      // TODO: Add PDF text extraction
      // const pdfParse = require('pdf-parse');
      // const data = await pdfParse(buffer);
      // extractedText = data.text.slice(0, 50000);
      
      return;
    } else {
      // Images and other files - no text extraction for now
      return;
    }

    if (extractedText) {
      await supabase
        .from('chat_files')
        .update({ 
          extracted_text: extractedText,
          status: 'processed',
        })
        .eq('id', fileId);
    }
  } catch (error) {
    console.error('[ChatFiles] Text extraction error:', error);
    await supabase
      .from('chat_files')
      .update({ 
        status: 'error',
        extraction_error: error instanceof Error ? error.message : 'Extraction failed',
      })
      .eq('id', fileId);
  }
}

