

export function dataURLtoFile(dataurl: string, filename: string): File {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
    let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

export function dataURLtoBlob(dataurl: string): Blob {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
    let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

// --- ZIP Creation ---

export async function createZip(files: { name: string, blob: Blob | string }[]): Promise<Blob> {
    // Dynamic import to avoid loading JSZip library on initial page load
    const module = await import('jszip');
    const JSZip = module.default;
    
    const zip = new JSZip();
    for (const file of files) {
        zip.file(file.name, file.blob);
    }
    return await zip.generateAsync({ type: "blob" });
}

export function formatDateForFilename(timestamp: number): string {
    const date = new Date(timestamp);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const mins = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}-${month}-${year} ${hours}.${mins} ${ampm}`;
}