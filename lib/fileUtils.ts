// Helper functions for converting files to/from base64 for draft storage

export interface FileData {
    name: string
    type: string
    base64: string
}

export const fileToBase64 = (file: File): Promise<FileData> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            resolve({
                name: file.name,
                type: file.type,
                base64: reader.result as string
            })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

export const base64ToFile = (fileData: FileData): File => {
    // Convert base64 to blob
    const byteString = atob(fileData.base64.split(',')[1])
    const mimeString = fileData.base64.split(',')[0].split(':')[1].split(';')[0]

    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i)
    }

    const blob = new Blob([ab], { type: mimeString })
    return new File([blob], fileData.name, { type: fileData.type })
}
