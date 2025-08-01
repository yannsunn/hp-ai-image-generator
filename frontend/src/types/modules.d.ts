// Type declarations for modules without TypeScript definitions

declare module './ImageGallery' {
  import { GeneratedImage } from './index';
  
  interface ImageGalleryProps {
    images: GeneratedImage[];
    onEdit: (image: GeneratedImage) => void;
    onDownload: (imageSrc: string, filename?: string) => void;
  }
  
  const ImageGallery: React.FC<ImageGalleryProps>;
  export default ImageGallery;
}

declare module '../utils/logger' {
  interface Logger {
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  }
  
  const logger: Logger;
  export default logger;
}