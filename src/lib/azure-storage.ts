import { BlobServiceClient, BlobSASPermissions, BlobGenerateSasUrlOptions } from '@azure/storage-blob';
import { randomUUID } from 'crypto';

const getBlobServiceClient = () => {
  const connectionString = process.env.STORAGE_URL;
  if (!connectionString) {
    throw new Error('A variavel STORAGE_URL nao esta configurada no .env');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
};

// uploadFileToAzure
export async function uploadFileToAzure(file: File, containerName: string, folderPath?: string): Promise<string> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists();

  const extension = file.name.split('.').pop();
  // Cria a estrutura de pastas virtual. Ex: tenant-101/proposta-5/uuid.pdf
  const blobName = folderPath ? `${folderPath}/${randomUUID()}.${extension}` : `${randomUUID()}.${extension}`;
  
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: file.type }
  });

  return `${containerName}/${blobName}`;
}

// deleteFileFromAzureByPath
export async function deleteFileFromAzureByPath(filePathOrUrl: string): Promise<void> {
  try {
    if (!filePathOrUrl) return;
    
    const blobServiceClient = getBlobServiceClient();
    
    let relativePath = filePathOrUrl;
    if (filePathOrUrl.startsWith('http')) {
      const url = new URL(filePathOrUrl);
      relativePath = url.pathname.substring(1);
    }
    
    const parts = relativePath.split('/');
    if (parts.length < 2) return;

    // Se o caminho salvo é "private-docs/tenant-X/proposta-Y/arquivo.pdf"
    const containerName = parts[0]; // "private-docs"
    const blobName = parts.slice(1).join('/'); // "tenant-X/proposta-Y/arquivo.pdf"

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Deleta fisicamente se existir
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error("Erro ao deletar arquivo no Azure:", error);
  }
}

// getFileDownloadUrl
export async function getFileDownloadUrl(filePath: string, originalName?: string, inline: boolean = false): Promise<string> {
  const blobServiceClient = getBlobServiceClient();
  
  let relativePath = filePath;
  if (filePath.startsWith('http')) {
    const url = new URL(filePath);
    relativePath = url.pathname.substring(1);
  }
  
  const parts = relativePath.split('/');
  const containerName = parts[0];
  const blobName = parts.slice(1).join('/'); 

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(blobName);

  const sasOptions: BlobGenerateSasUrlOptions = {
    permissions: BlobSASPermissions.parse("r"),
    expiresOn: new Date(new Date().valueOf() + 3600 * 1000) // 1 hora
  };

  // Se 'inline' for true, abre no navegador. Se for false, força o download (attachment)
  if (originalName) {
    const dispositionType = inline ? 'inline' : 'attachment';
    sasOptions.contentDisposition = `${dispositionType}; filename="${encodeURIComponent(originalName)}"`;
  } else if (inline) {
    sasOptions.contentDisposition = 'inline';
  }

  const sasUrl = await blobClient.generateSasUrl(sasOptions);
  return sasUrl;
}

// NOVA FUNÇÃO: Gera URL temporária para UPLOAD DIRETO (Direct-to-Cloud)
export async function getUploadSasUrl(containerName: string, folderPath: string, fileName: string) {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  // Garante que o container exista
  await containerClient.createIfNotExists();

  const extension = fileName.split('.').pop();
  const blobName = `${folderPath}/${randomUUID()}.${extension}`;
  
  const blobClient = containerClient.getBlockBlobClient(blobName);

  // Permissão 'c' (Create) e 'w' (Write) válidas por 15 minutos
  const sasUrl = await blobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("cw"),
    expiresOn: new Date(new Date().valueOf() + 15 * 60 * 1000)
  });

  return { 
    uploadUrl: sasUrl, 
    relativePath: `${containerName}/${blobName}` 
  };
}
