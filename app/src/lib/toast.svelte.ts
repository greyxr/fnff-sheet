// A short message in the corner, for what an action just did (or why it failed).
export const toast = $state({ message: '', bad: false })
let timer: ReturnType<typeof setTimeout> | undefined

export function showToast(message: string, bad = false) {
  Object.assign(toast, { message, bad })
  clearTimeout(timer)
  timer = setTimeout(
    () => {
      toast.message = ''
    },
    bad ? 5000 : 2400,
  )
}
