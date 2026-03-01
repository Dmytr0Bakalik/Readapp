package com.example.speedreader

import android.content.Context
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader

object DocumentExtractor {

    suspend fun extractText(context: Context, uri: Uri): String = withContext(Dispatchers.IO) {
        val contentResolver = context.contentResolver
        val mimeType = contentResolver.getType(uri) ?: ""
        
        if (mimeType.contains("pdf") || uri.toString().endsWith(".pdf")) {
            extractPdfText(context, uri)
        } else {
            extractPlainText(context, uri)
        }
    }

    private fun extractPlainText(context: Context, uri: Uri): String {
        val inputStream = context.contentResolver.openInputStream(uri) ?: return ""
        val reader = BufferedReader(InputStreamReader(inputStream))
        val text = reader.readText()
        reader.close()
        return text
    }

    // Very basic PDF text extraction on Android without external libraries
    // (Note: Since standard Android API PdfRenderer renders to Bitmaps and doesn't extract raw text natively easily without libraries like Pdfium or iText, we use a mock placeholder here for text, or rely on TXT. However, for this demonstration we will use a naive extraction assuming basic support or relying on TXT).
    // In a real production app, use Apache PDFBox Android or iText.
    private fun extractPdfText(context: Context, uri: Uri): String {
        // Due to Android limitations with native PDF text extraction, 
        // this is a placeholder. A 3rd party lib is required for robust text extraction.
        return "PDF imported successfully. However, native Android requires a 3rd party library (like PDFBox) to extract raw text from PDF files. For now, please use .txt files for full functionality."
    }
}
