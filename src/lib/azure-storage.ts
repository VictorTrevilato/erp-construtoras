import { BlobServiceClient } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const getBlobServiceClient = () => {
  const connectionString = process.env.STORAGE_URL;
  if (!connectionString) {
    throw new Error('A variavel STORAGE_URL nao esta configurada no .env');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
};

export async function uploadFileToAzure(file: File, containerName: string): Promise<string> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists();

  const extension = file.name.split('.').pop();
  const blobName = `${randomUUID()}.${extension}`;
  
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: file.type }
  });

  // Retorna apenas o caminho relativo, ex: "public-assets/34b69a...png"
  return `${containerName}/${blobName}`;
}

export async function deleteFileFromAzureByPath(filePathOrUrl: string): Promise<void> {
  try {
    if (!filePathOrUrl) return;
    
    const blobServiceClient = getBlobServiceClient();
    
    // Fallback: se for uma URL antiga completa, extrai apenas o caminho relativo
    let relativePath = filePathOrUrl;
    if (filePathOrUrl.startsWith('http')) {
      const url = new URL(filePathOrUrl);
      relativePath = url.pathname.substring(1);
    }
    
    const parts = relativePath.split('/');
    if (parts.length < 2) return;

    const containerName = parts[0];
    const blobName = parts.slice(1).join('/'); 

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error("Erro ao deletar arquivo no Azure:", error);
  }
}