class ToastManager {
  createToast(message, type, options = {}) {
    const { duration = 3000, position = 'top-right' } = options
    
    const toastEl = document.createElement('div')
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    }
    
    const positions = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4'
    }
    
    toastEl.className = `fixed ${positions[position]} ${colors[type]} text-white px-4 py-2 rounded-md shadow-lg z-50 transform transition-transform duration-300`
    toastEl.textContent = message
    
    document.body.appendChild(toastEl)
    
    setTimeout(() => {
      toastEl.style.transform = position.includes('right') ? 'translateX(100%)' : 'translateX(-100%)'
      setTimeout(() => {
        if (document.body.contains(toastEl)) {
          document.body.removeChild(toastEl)
        }
      }, 300)
    }, duration)
  }
  
  success(message, options) {
    this.createToast(message, 'success', options)
  }
  
  error(message, options) {
    this.createToast(message, 'error', options)
  }
  
  info(message, options) {
    this.createToast(message, 'info', options)
  }
  
  warning(message, options) {
    this.createToast(message, 'warning', options)
  }
}

const toast = new ToastManager()

export { toast }