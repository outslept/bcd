import type { ReactNode, RefObject } from "react";

function CompatTableBody({
  ref,
  children,
  ...props
}: {
  children: ReactNode;
  ref?: RefObject<HTMLTableSectionElement | null>;
}) {
  return (
    <tbody ref={ref} {...props}>
      {children}
    </tbody>
  );
}

export { CompatTableBody };
