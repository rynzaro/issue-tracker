"use client";

import { Avatar } from "@/components/avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/dropdown";
import {
  Navbar,
  NavbarDivider,
  NavbarItem,
  NavbarLabel,
  NavbarSection,
  NavbarSpacer,
} from "@/components/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/sidebar";
import { StackedLayout } from "@/components/stacked-layout";
import {
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog8ToothIcon,
  PlusIcon,
} from "@heroicons/react/16/solid";
import clsx from "clsx";
import { ReactNode } from "react";

const navItems = [{ label: "Home", url: "/" }];
1;
function ProjectDropdownMenu({
  projects,
}: {
  projects: { id: string; name: string }[];
}) {
  return (
    <DropdownMenu className="min-w-80 lg:min-w-64" anchor="bottom start">
      {projects.map((project, id) => (
        <DropdownItem key={project.id} href={`/s/project/${project.id}`}>
          <Avatar
            initials={project.name.substring(0, 2).toUpperCase()}
            className={clsx(
              id % 2 === 0
                ? "bg-amber-400 text-amber-800"
                : "bg-green-300 text-green-700",
            )}
            square
          />
          <DropdownLabel> {project.name}</DropdownLabel>
        </DropdownItem>
      ))}
      <DropdownDivider />
      <DropdownItem href="/s/project/create">
        <PlusIcon />
        <DropdownLabel>Neues Projekt erstellen</DropdownLabel>
      </DropdownItem>
    </DropdownMenu>
  );
}

export function NavbarApp({
  children,
  emailAddress,
  projects,
}: {
  children: ReactNode;
  emailAddress: string;
  projects: { id: string; name: string }[];
}) {
  return (
    <StackedLayout
      navbar={
        <Navbar>
          <Dropdown>
            <DropdownButton as={NavbarItem} className="max-lg:hidden">
              <NavbarLabel>OnTrack</NavbarLabel>
              <ChevronDownIcon />
            </DropdownButton>
            <ProjectDropdownMenu projects={projects} />
          </Dropdown>
          <NavbarDivider className="max-lg:hidden" />
          <NavbarSection className="max-lg:hidden">
            {navItems.map(({ label, url }) => (
              <NavbarItem key={label} href={url}>
                {label}
              </NavbarItem>
            ))}
          </NavbarSection>
          <NavbarSpacer />
          <NavbarSection>
            <Dropdown>
              <DropdownButton as={NavbarItem}>
                {emailAddress}
                <ChevronDownIcon />
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
            <Dropdown>
              <DropdownButton as={SidebarItem} className="lg:mb-2.5">
                <Avatar initials="EF" />
                <SidebarLabel>OnTrack</SidebarLabel>
                <ChevronDownIcon />
              </DropdownButton>
              <ProjectDropdownMenu projects={projects} />
            </Dropdown>
          </SidebarHeader>
          <SidebarBody>
            <SidebarSection>
              {navItems.map(({ label, url }) => (
                <SidebarItem key={label} href={url}>
                  {label}
                </SidebarItem>
              ))}
            </SidebarSection>
          </SidebarBody>
        </Sidebar>
      }
    >
      {children}
    </StackedLayout>
  );
}
