import BrandLoader from "@/components/BrandLoader";

export default function DashboardLoading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <BrandLoader
        fullScreen={false}
        message="Loading workspace..."
        submessage="Synchronizing real-time records & analytics"
      />
    </div>
  );
}

