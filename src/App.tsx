import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import ProjectPage from "@/pages/ProjectPage";
import TerminalWindow from "@/pages/TerminalWindow";
import UpdateChecker from "@/components/UpdateChecker";

function App() {
  const navigate = useNavigate();

  useEffect(() => {
    const unlisten = listen("navigate-home", () => {
      navigate("/");
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [navigate]);

  return (
    <TooltipProvider>
      <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:projectId" element={<ProjectPage />} />
          <Route path="/terminal" element={<TerminalWindow />} />
        </Routes>
        <Toaster position="bottom-right" />
        <UpdateChecker />
      </div>
    </TooltipProvider>
  );
}

export default App;
