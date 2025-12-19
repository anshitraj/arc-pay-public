import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // #region agent log
  const cookiesBefore = typeof document !== 'undefined' ? document.cookie : 'N/A';
  fetch('http://127.0.0.1:7242/ingest/c691fb4a-bcdf-4041-98c2-b27e38f1b331',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:15',message:'apiRequest before fetch',data:{method,url,hasCookies:cookiesBefore.length>0,cookies:cookiesBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // #region agent log
  const cookiesAfter = typeof document !== 'undefined' ? document.cookie : 'N/A';
  const setCookieHeader = res.headers.get('Set-Cookie');
  fetch('http://127.0.0.1:7242/ingest/c691fb4a-bcdf-4041-98c2-b27e38f1b331',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:25',message:'apiRequest after fetch',data:{method,url,status:res.status,statusText:res.statusText,setCookieHeader:setCookieHeader,hasCookies:cookiesAfter.length>0,cookies:cookiesAfter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
  // #endregion

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    // #region agent log
    const cookiesBefore = typeof document !== 'undefined' ? document.cookie : 'N/A';
    fetch('http://127.0.0.1:7242/ingest/c691fb4a-bcdf-4041-98c2-b27e38f1b331',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:33',message:'getQueryFn before fetch',data:{url,hasCookies:cookiesBefore.length>0,cookies:cookiesBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    const res = await fetch(url, {
      credentials: "include",
    });

    // #region agent log
    const cookiesAfter = typeof document !== 'undefined' ? document.cookie : 'N/A';
    const setCookieHeader = res.headers.get('Set-Cookie');
    fetch('http://127.0.0.1:7242/ingest/c691fb4a-bcdf-4041-98c2-b27e38f1b331',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client/src/lib/queryClient.ts:40',message:'getQueryFn after fetch',data:{url,status:res.status,statusText:res.statusText,setCookieHeader:setCookieHeader,hasCookies:cookiesAfter.length>0,cookies:cookiesAfter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    // If 401 and not set to return null, let it throw (will be handled by ProtectedRoute)
    if (res.status === 401 && unauthorizedBehavior === "throw") {
      await throwIfResNotOk(res);
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
