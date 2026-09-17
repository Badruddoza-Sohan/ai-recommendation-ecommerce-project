import { AISupportChat } from "@/components/AISupportChat";
import { useNavigate } from "react-router";

export default function Support() {
  const navigate = useNavigate();
  return (
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col">
      <AISupportChat isOpen={true} onClose={() => navigate("/")} />
    </div>
  );
}
