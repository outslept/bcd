interface CompatTableBodyProps {
  children: React.ReactNode;
}

const CompatTableBody = ({
  ref,
  children,
  ...props
}: CompatTableBodyProps & {
  ref?: React.RefObject<HTMLTableSectionElement | null>;
}) => {
  return (
    <tbody ref={ref} data-compat-table-body="" {...props}>
      {children}
    </tbody>
  );
};

export { CompatTableBody };
