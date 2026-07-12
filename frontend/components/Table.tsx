'use client';

import React from 'react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  className?: string;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  isNumeric?: boolean;
  className?: string;
}

interface TableHeaderCellProps extends React.ThHTMLAttributes<HTMLTableHeaderCellElement> {
  children: React.ReactNode;
  isNumeric?: boolean;
  className?: string;
}

export function Table({ children, className = '', ...props }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full border-collapse text-left text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return (
    <thead className={`bg-bg-elevated border-b border-border-subtle ${className}`}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }: TableRowProps) {
  return (
    <tr
      className={`border-b border-border-subtle hover:bg-bg-elevated transition-colors duration-fast ease-standard ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeaderCell({ children, isNumeric = false, className = '', ...props }: TableHeaderCellProps) {
  return (
    <th
      className={`py-4 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted ${
        isNumeric ? 'text-right' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ children, isNumeric = false, className = '', ...props }: TableCellProps) {
  return (
    <td
      className={`py-4 px-4 text-text-primary ${
        isNumeric ? 'text-right font-mono' : 'text-left'
      } ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
