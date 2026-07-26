/**
 * Compatibility layer: exposes the small react-router-dom surface used by the
 * app on top of TanStack Router, so page/component code stays untouched.
 */
import {
  Link as TSLink,
  useRouter,
  useRouterState,
  useParams as useTSParams,
} from "@tanstack/react-router";
import * as React from "react";

type To = string;

function splitPath(to: To) {
  const [beforeHash, hash] = to.split("#");
  const [pathname, search] = beforeHash.split("?");
  return {
    pathname: pathname || "/",
    search: search ? `?${search}` : "",
    hash: hash ? `#${hash}` : "",
  };
}

export interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

export function useNavigate() {
  const router = useRouter();
  return React.useCallback(
    (to: To | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        router.history.go(to);
        return;
      }
      const { pathname, search, hash } = splitPath(to);
      router.navigate({
        href: `${pathname}${search}${hash}`,
        replace: options?.replace,
        state: (options?.state ?? undefined) as never,
      } as never);
    },
    [router],
  );
}

export function useLocation() {
  const location = useRouterState({ select: (s) => s.location });
  return {
    pathname: location.pathname,
    search: location.searchStr ?? "",
    hash: location.hash ? `#${location.hash}` : "",
    state: location.state as unknown as Record<string, unknown>,
    key: location.href,
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useTSParams({ strict: false }) as unknown as T;
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string>, options?: NavigateOptions) => void,
] {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr ?? "" });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const params = React.useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const setParams = React.useCallback(
    (next: URLSearchParams | Record<string, string>, options?: NavigateOptions) => {
      const sp = next instanceof URLSearchParams ? next : new URLSearchParams(next);
      const qs = sp.toString();
      router.navigate({
        href: qs ? `${pathname}?${qs}` : pathname,
        replace: options?.replace,
      } as never);
    },
    [router, pathname],
  );
  return [params, setParams];
}

export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: To;
  replace?: boolean;
  state?: unknown;
  children?: React.ReactNode;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, replace, state, children, ...rest },
  ref,
) {
  const { pathname, search, hash } = splitPath(to);
  return (
    <TSLink
      ref={ref}
      to={pathname as never}
      search={search ? (Object.fromEntries(new URLSearchParams(search)) as never) : undefined}
      hash={hash ? hash.slice(1) : undefined}
      replace={replace}
      state={state as never}
      {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {children}
    </TSLink>
  );
});

export interface NavLinkProps
  extends Omit<LinkProps, "className" | "style" | "children"> {
  className?: string | ((props: { isActive: boolean; isPending: boolean }) => string);
  style?:
    | React.CSSProperties
    | ((props: { isActive: boolean; isPending: boolean }) => React.CSSProperties);
  end?: boolean;
  children?:
    | React.ReactNode
    | ((props: { isActive: boolean; isPending: boolean }) => React.ReactNode);
}

export const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink(
  { to, className, style, end, children, ...rest },
  ref,
) {
  const location = useLocation();
  const { pathname, hash } = splitPath(to);
  const isActive = end
    ? location.pathname === pathname && (!hash || location.hash === hash)
    : location.pathname.startsWith(pathname) && (!hash || location.hash === hash);
  return (
    <Link
      ref={ref}
      to={to}
      className={
        typeof className === "function" ? className({ isActive, isPending: false }) : className
      }
      style={typeof style === "function" ? style({ isActive, isPending: false }) : style}
      {...rest}
    >
      {typeof children === "function"
        ? children({ isActive, isPending: false })
        : children}
    </Link>
  );
});

export function Navigate({
  to,
  replace,
  state,
}: {
  to: To;
  replace?: boolean;
  state?: unknown;
}) {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate(to, { replace, state });
  }, [to, replace, state, navigate]);
  return null;
}

export function Outlet() {
  return null;
}