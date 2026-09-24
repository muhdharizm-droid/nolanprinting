import BrandLoader from "@/components/BrandLoader";

export default function Loading() {
  return (
    <BrandLoader
      fullScreen={true}
      message="Loading Nolan Printing..."
      submessage="Preparing system resources & security"
    />
  );
}

