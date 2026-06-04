export type ComicSummary = {
    id: number;
    title: string;
    publisher: string;
    year: number | null;
    image: string;
    totalIssues: number;
  };
  
  export type ComicDetail = ComicSummary & {
    deck: string;
    summary: string;
    creators: string[];
    characters: string[];
    concepts: string[];
    buyLink: string;
    recommendations: ComicSummary[];
  };
  
  export type Status = "to-read" | "reading" | "done";
  
  export type ListItem = {
    id: string;
    volumeId: number;
    title: string;
    publisher: string;
    year: number | null;
    image: string;
    totalIssues: number;
    status: Status;
    progress: number;
    rating: number;
    readNextRank: number | null;
    addedAt: string;
  };