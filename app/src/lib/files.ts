export function downloadJson(filename: string, data: unknown) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href))
}

export const readJsonFile = async (file: File): Promise<unknown> => {
  try {
    return JSON.parse(await file.text())
  } catch {
    throw new Error(`${file.name} is not a JSON file`)
  }
}
