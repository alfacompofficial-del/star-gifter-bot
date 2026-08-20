import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Предотвращаем автоматический показ стандартного окна браузера
      e.preventDefault();
      setDeferredPrompt(e);

      // Проверяем, есть ли в URL параметр ?install=true
      const params = new URLSearchParams(window.location.search);
      if (params.get("install") === "true") {
        setIsOpen(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      toast({
        title: "Установка пока недоступна",
        description: "Ваш браузер уже установил приложение или не поддерживает установку напрямую.",
      });
      setIsOpen(false);
      return;
    }

    // Показываем стандартное окно установки
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      toast({
        title: "Спасибо за установку!",
        description: "Приложение AlfaComp теперь доступно на вашем рабочем столе.",
      });
    }

    setDeferredPrompt(null);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Установить приложение AlfaComp
          </DialogTitle>
          <DialogDescription>
            Установите наш магазин на свой экран для быстрого доступа к товарам и уведомлениям о скидках.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex sm:justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Позже
          </Button>
          <Button onClick={handleInstall} className="gap-2">
            <Download className="w-4 h-4" />
            Установить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PWAInstallPrompt;
