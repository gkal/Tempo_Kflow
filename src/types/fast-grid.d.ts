declare module 'fast-grid' {
  export interface GridColumn {
    key: string;
    title: string;
    width?: number | string;
    sortable?: boolean;
    cellRenderer?: (cell: { rowData: any; column: GridColumn; value: any }) => string;
    headerRenderer?: (column: GridColumn) => string;
  }

  export interface GridStyle {
    grid?: {
      backgroundColor?: string;
      color?: string;
      border?: string;
      borderRadius?: string;
      overflow?: string;
      [key: string]: any;
    };
    header?: {
      backgroundColor?: string;
      color?: string;
      borderBottom?: string;
      fontWeight?: string;
      fontSize?: string;
      textAlign?: string;
      [key: string]: any;
    };
    row?: {
      borderBottom?: string;
      hoverBackgroundColor?: string;
      cursor?: string;
      [key: string]: any;
    };
    cell?: {
      padding?: string;
      fontSize?: string;
      fontWeight?: string;
      whiteSpace?: string;
      overflow?: string;
      textOverflow?: string;
      [key: string]: any;
    };
  }

  export interface GridOptions {
    containerElement: HTMLElement;
    rowHeight?: number;
    headerHeight?: number;
    columns: GridColumn[];
    style?: GridStyle;
    onRowClick?: (row: any) => void;
    onCellClick?: (cell: any, event: MouseEvent) => void;
    pagination?: {
      pageSize: number;
      totalItems: number;
      fetchCallback: (pageIndex: number) => Promise<any[]>;
    };
    groupBy?: string[];
  }

  export interface GridInstance {
    addData: (data: any[]) => void;
    clearData: () => void;
    getRows: () => any[];
    refresh: () => void;
    destroy: () => void;
  }

  export function createGrid(options: GridOptions): GridInstance;
} 