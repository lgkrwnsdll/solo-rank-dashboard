import { Spinner } from "../../spinner";

export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Spinner className="h-8 w-8 text-muted" />
    </div>
  );
}
