import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/HomePage";
import ProjectPage from "@/pages/ProjectPage";
import TerminalWindow from "@/pages/TerminalWindow";
import UpdateChecker from "@/components/UpdateChecker";

function App() {
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
