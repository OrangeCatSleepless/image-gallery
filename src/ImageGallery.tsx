'use client'

import React, { useState, useCallback, useRef, useEffect, ChangeEvent } from 'react';
import Masonry from 'react-masonry-css';
import { useInView } from 'react-intersection-observer';

interface ImageData {
  id: string;
  thumbnail: string;
  fullSize: string;
}

// 扩展 InputHTMLAttributes 接口
interface ExtendedInputHTMLAttributes extends React.InputHTMLAttributes<HTMLInputElement> {
  webkitdirectory?: string;
  directory?: string;
}

const ImageGallery: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateThumbnail = (file: File): Promise<ImageData> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            const scale = 300 / Math.max(img.width, img.height);
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({
              id: `${file.name}-${Date.now()}`,
              thumbnail: canvas.toDataURL(file.type),
              fullSize: URL.createObjectURL(file),
            });
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFolderSelect = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setIsLoading(true);
      setLoadingProgress(0);
      const imageFiles = Array.from(files).filter(file => 
        file.type.startsWith('image/')
      );

      const totalFiles = imageFiles.length;
      let processedFiles = 0;

      const newImages = await Promise.all(
        imageFiles.map(async (file) => {
          const image = await generateThumbnail(file);
          processedFiles++;
          setLoadingProgress(Math.round((processedFiles / totalFiles) * 100));
          return image;
        })
      );

      setImages(prevImages => [...prevImages, ...newImages]);
      setIsLoading(false);
    }
  }, []);

  const handleImageClick = useCallback((image: ImageData) => {
    setSelectedImage(image);
    document.body.style.overflow = 'hidden';
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  }, []);

  const handlePrevImage = useCallback(() => {
    if (selectedImage) {
      const currentIndex = images.findIndex(img => img.id === selectedImage.id);
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      setSelectedImage(images[prevIndex]);
    }
  }, [selectedImage, images]);

  const handleNextImage = useCallback(() => {
    if (selectedImage) {
      const currentIndex = images.findIndex(img => img.id === selectedImage.id);
      const nextIndex = (currentIndex + 1) % images.length;
      setSelectedImage(images[nextIndex]);
    }
  }, [selectedImage, images]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImage) {
        if (e.key === 'ArrowLeft') handlePrevImage();
        if (e.key === 'ArrowRight') handleNextImage();
        if (e.key === 'Escape') handleCloseModal();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (selectedImage) {
        e.preventDefault();
        if (e.deltaY > 0) handleNextImage();
        if (e.deltaY < 0) handlePrevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [selectedImage, handlePrevImage, handleNextImage, handleCloseModal]);

  useEffect(() => {
    if (selectedImage) {
      const currentIndex = images.findIndex(img => img.id === selectedImage.id);
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      const nextIndex = (currentIndex + 1) % images.length;

      const preloadImage = (src: string) => {
        const img = new Image();
        img.src = src;
      };

      preloadImage(images[prevIndex].fullSize);
      preloadImage(images[nextIndex].fullSize);
    }
  }, [selectedImage, images]);

  const breakpointColumnsObj = {
    default: 6,
    1536: 5,
    1280: 4,
    1024: 3,
    768: 2,
    640: 1
  };

  const LazyImage: React.FC<{ image: ImageData }> = ({ image }) => {
    const [ref, inView] = useInView({
      triggerOnce: true,
      rootMargin: '200px 0px',
    });

    return (
      <div ref={ref} className="mb-4">
        <div
          className="overflow-hidden rounded-lg bg-gray-200 shadow-lg transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-xl cursor-pointer"
          onClick={() => handleImageClick(image)}
        >
          {inView ? (
            <img
              src={image.thumbnail}
              alt={`${image.id}`}
              className="w-full h-auto object-cover transition-opacity duration-300 ease-in-out"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-0 pb-[100%] bg-gray-300 animate-pulse" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-200 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">图片画廊</h1>
        <div className="mb-8 text-center">
          <label htmlFor="folder-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:scale-105 shadow-lg">
            选择文件夹
          </label>
          <input
            id="folder-upload"
            type="file"
            onChange={handleFolderSelect}
            className="hidden"
            {...({
              webkitdirectory: "",
              directory: "",
              multiple: true
            } as ExtendedInputHTMLAttributes)}
          />
        </div>
        {isLoading && (
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">正在加载图片... {loadingProgress}%</p>
          </div>
        )}
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="flex w-auto -ml-4"
          columnClassName="pl-4 bg-clip-padding"
        >
          {images.map((image) => (
            <LazyImage key={image.id} image={image} />
          ))}
        </Masonry>
        {images.length === 0 && !isLoading && (
          <p className="text-center text-gray-600">还没有选择图片，请选择一个包含图片的文件夹。</p>
        )}
      </div>
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={handleCloseModal}>
          <div className="w-[90vw] h-[90vh] flex items-center justify-center">
            <img
              src={selectedImage.fullSize}
              alt={`Full size ${selectedImage.id}`}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <button
            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all duration-300"
            onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
          >
            &#8249;
          </button>
          <button
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-all duration-300"
            onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
          >
            &#8250;
          </button>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ImageGallery;
