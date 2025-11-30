import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, items, align = "right" }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // 메뉴 위치 계산
  const updateMenuPosition = React.useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 120; // min-width

      let left = align === "right" ? rect.right - menuWidth : rect.left;

      // 화면 밖으로 나가지 않도록 조정
      if (left < 8) left = 8;
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setMenuPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  }, [align]);

  // 외부 클릭 시 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      updateMenuPosition();
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, updateMenuPosition]);

  // Escape 키로 닫기
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateMenuPosition();
    }
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: DropdownMenuItem) => (e: React.MouseEvent) => {
    e.stopPropagation();
    item.onClick();
    setIsOpen(false);
  };

  return (
    <div ref={triggerRef} className="relative">
      {/* Trigger */}
      <div onClick={handleTriggerClick}>{trigger}</div>

      {/* Menu - Portal로 body에 렌더링하여 overflow 문제 해결 */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={cn(
              "fixed z-[9999] min-w-[120px] py-1",
              "bg-white rounded-md shadow-lg border border-warm-200"
            )}
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
            }}
          >
            {items.map((item, index) => (
              <button
                key={index}
                onClick={handleItemClick(item)}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                  "transition-colors",
                  item.variant === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-primary-700 hover:bg-warm-100"
                )}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
