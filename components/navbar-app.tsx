"use client";

import { Avatar } from "@/components/avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/dropdown";
import {
  Navbar,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from "@/components/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/sidebar";
import { SidebarLayout } from "@/components/sidebar-layout";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import ActiveTimerNavbar from "@/components/active-timer-navbar";
import ActiveTimerPill from "@/components/active-timer-pill";

export type ActiveTimerData = {
  taskId: string;
  taskTitle: string;
  startedAt: Date;
} | null;

export function NavbarApp({
  children,
  emailAddress,
  projects,
  activeTimer,
}: {
  children: ReactNode;
  emailAddress: string;
  projects: { id: string; name: string }[];
  activeTimer: ActiveTimerData | null;
}) {
  const pathname = usePathname();

  return (
    <>
      <SidebarLayout
        mobileBottomPadding={!!activeTimer}
        navbar={
          <Navbar>
            <NavbarLabel className="font-semibold">OnTrack</NavbarLabel>
            <NavbarSpacer />
            {activeTimer && <ActiveTimerNavbar timer={activeTimer} />}
            <NavbarSection>
              <Dropdown>
                <DropdownButton as="button" className="flex items-center gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {emailAddress}
                  <ChevronDownIcon className="size-4" />
                </DropdownButton>
                <DropdownMenu className="min-w-64" anchor="bottom end">
                  <DropdownItem href="/settings">
                    <Cog8ToothIcon />
                    <DropdownLabel>Settings</DropdownLabel>
                  </DropdownItem>
                  <DropdownItem href="/s/logout">
                    <ArrowRightStartOnRectangleIcon />
                    <DropdownLabel>Sign out</DropdownLabel>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarSection>
          </Navbar>
        }
        sidebar={
          <Sidebar>
            <SidebarHeader>
              <SidebarItem href="/s/main" className="font-semibold">
                <SidebarLabel>OnTrack</SidebarLabel>
              </SidebarItem>
            </SidebarHeader>
            <SidebarBody>
              <SidebarSection>
                {projects.map((project, idx) => (
                  <SidebarItem
                    key={project.id}
                    href={`/s/project/${project.id}`}
                    current={pathname.startsWith(`/s/project/${project.id}`)}
                  >
                    <Avatar
                      initials={project.name.substring(0, 2).toUpperCase()}
                      className={
                        idx % 2 === 0
                          ? "bg-amber-400 text-amber-800"
                          : "bg-green-300 text-green-700"
                      }
                      square
                    />
                    <SidebarLabel>{project.name}</SidebarLabel>
                  </SidebarItem>
                ))}
              </SidebarSection>
            </SidebarBody>
            <SidebarFooter>
              <SidebarSection>
                {activeTimer && (
                  <div className="max-lg:hidden">
                    <ActiveTimerNavbar timer={activeTimer} />
                  </div>
                )}
                <SidebarItem href="/s/project/create">
                  <PlusIcon data-slot="icon" />
                  <SidebarLabel>Neues Projekt</SidebarLabel>
                </SidebarItem>
                <Dropdown>
                  <DropdownButton as={SidebarItem}>
                    <SidebarLabel className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {emailAddress}
                    </SidebarLabel>
                    <ChevronDownIcon />
                  </DropdownButton>
                  <DropdownMenu className="min-w-64" anchor="top start">
                    <DropdownItem href="/settings">
                      <Cog8ToothIcon />
                      <DropdownLabel>Settings</DropdownLabel>
                    </DropdownItem>
                    <DropdownItem href="/s/logout">
                      <ArrowRightStartOnRectangleIcon />
                      <DropdownLabel>Sign out</DropdownLabel>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </SidebarSection>
            </SidebarFooter>
          </Sidebar>
        }
      >
        {children}
      </SidebarLayout>
      {activeTimer && <ActiveTimerPill timer={activeTimer} />}
    </>
  );
}
