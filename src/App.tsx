import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Login } from "./pages/Login";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isSessionValid } from "@/utils/auth";

const queryClient = new QueryClient();

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // 检查会话是否有效 (包含过期验证)
    if (isSessionValid()) {
      setIsLoggedIn(true);
    }
    setIsChecking(false);
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // Show nothing while checking login status
  if (isChecking) {
    return null;
  }

  // Show login page if not logged in
  if (!isLoggedIn) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Login onLogin={handleLogin} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  // Show main app if logged in
  return (
    <ErrorBoundary
      fallbackTitle="应用程序错误"
      fallbackMessage="抱歉,应用遇到了一些问题。请尝试重新加载页面。"
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
