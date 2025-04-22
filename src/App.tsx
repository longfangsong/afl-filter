import { ChangeEvent, useState, useEffect } from "react";
import "./App.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { Checkbox } from "./components/ui/checkbox";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./components/ui/command";
import { CommandList } from "./components/ui/command";
import { Command } from "./components/ui/command";
import { Button } from "./components/ui/button";
import { cn } from "./lib/utils";
import type { Job } from "./types/job";
import { fieldMap, regionMap } from "../cron/afl-crawler/src/data";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";

const fields = Object.entries(fieldMap).map(([value, label]) => ({
  value,
  label,
}));

const regions = Object.entries(regionMap).map(([value, label]) => ({
  value,
  label,
}));

function App() {
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionValue, setRegionValue] = useState("");
  const [fieldOpen, setFieldOpen] = useState(false);
  const [fieldValue, setFieldValue] = useState("");
  const [needsVisaSponsor, setNeedsVisaSponsor] = useState(false);
  const [swedishFlunt, setSwedishFlunt] = useState(false);
  const [experience, setExperience] = useState("");
  const [excludeSkills, setExcludeSkills] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!fieldValue) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          field: fieldValue,
          ...(regionValue && { region: regionValue }),
          ...(experience && { experience }),
          ...(excludeSkills && { excludeSkills }),
          needsVisaSponsor: needsVisaSponsor.toString(),
          swedishFlunt: swedishFlunt.toString(),
        });

        const response = await fetch(`/api/jobs?${params}`);
        if (!response.ok) {
          throw new Error("Failed to fetch jobs");
        }
        const data = await response.json();
        setJobs(data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [
    fieldValue,
    regionValue,
    experience,
    excludeSkills,
    needsVisaSponsor,
    swedishFlunt,
  ]);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Filter Options</h1>
      <div className="flex flex-wrap gap-4 items-end">
        {/* Field Combobox */}
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="field-combobox">Field</Label>
          <Popover open={fieldOpen} onOpenChange={setFieldOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={fieldOpen}
                className="w-[200px] justify-between"
                id="field-combobox"
              >
                {fieldValue
                  ? fields.find((field) => field.value === fieldValue)?.label
                  : "Select field..."}
                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search field..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No field found.</CommandEmpty>
                  <CommandGroup>
                    {fields.map((field) => (
                      <CommandItem
                        key={field.value}
                        value={field.value}
                        onSelect={(currentValue: string) => {
                          setFieldValue(
                            currentValue === fieldValue ? "" : currentValue
                          );
                          setFieldOpen(false);
                        }}
                      >
                        {field.label}
                        <CheckIcon
                          className={cn(
                            "ml-auto h-4 w-4",
                            fieldValue === field.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Region Combobox */}
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="region-combobox">Region</Label>
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={regionOpen}
                className="w-[200px] justify-between"
                id="region-combobox"
              >
                {regionValue
                  ? regions.find((region) => region.value === regionValue)
                      ?.label
                  : "Select region..."}
                <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search region..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No region found.</CommandEmpty>
                  <CommandGroup>
                    {regions.map((region) => (
                      <CommandItem
                        key={region.value}
                        value={region.value}
                        onSelect={(currentValue: string) => {
                          setRegionValue(
                            currentValue === regionValue ? "" : currentValue
                          );
                          setRegionOpen(false);
                        }}
                      >
                        {region.label}
                        <CheckIcon
                          className={cn(
                            "ml-auto h-4 w-4",
                            regionValue === region.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Experience Input */}
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="experience">I have (Years) Experience</Label>
          <Input
            id="experience"
            type="number"
            placeholder="e.g., 3"
            value={experience}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setExperience(e.target.value)
            }
            className="w-[150px]"
            min="0"
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="visa-sponsor"
            checked={needsVisaSponsor}
            onCheckedChange={(checked: boolean) => setNeedsVisaSponsor(checked)}
          />
          <Label htmlFor="visa-sponsor">I need visa sponsorship</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="swedish"
            checked={swedishFlunt}
            onCheckedChange={(checked: boolean) => setSwedishFlunt(checked)}
          />
          <Label htmlFor="swedish">My Swedish is fluent</Label>
        </div>

        {/* Exclude Skills Input */}
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="exclude-skills">Skills I DON'T have</Label>
          <Input
            id="exclude-skills"
            type="text"
            placeholder="e.g., Java, Python"
            value={excludeSkills}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setExcludeSkills(e.target.value)
            }
            className="w-[200px]"
          />
        </div>
      </div>

      {/* Jobs Table */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Job Listings</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Location</TableHead>
                <TableHead className="text-left">Field</TableHead>
                <TableHead className="text-left">Experience</TableHead>
                <TableHead className="text-left">Visa Sponsor</TableHead>
                <TableHead className="text-left">Swedish Required</TableHead>
                <TableHead className="text-left w-[200px]">Skills</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() =>
                    window.open(
                      `https://arbetsformedlingen.se/platsbanken/annonser/${job.id}`,
                      "_blank"
                    )
                  }
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell className="text-left">{regions.find((r) => r.value === job.region)?.label || job.region}</TableCell>
                  <TableCell className="text-left">{fields.find((f) => f.value === job.field)?.label || job.field}</TableCell>
                  <TableCell className="text-left">{job.experience ? `${job.experience} years` : "unknown"}</TableCell>
                  <TableCell className="text-left">
                    {job.visa_sponsor === null ? (
                      <Tooltip>
                        <TooltipTrigger>unknown</TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Visa sponsorship is not mentioned in the job
                            description
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : job.visa_sponsor ? (
                      <Tooltip>
                        <TooltipTrigger>Yes</TooltipTrigger>
                        <TooltipContent>
                          <p>This company provides visa sponsorship</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>No</TooltipTrigger>
                        <TooltipContent>
                          <p>This company does not provide visa sponsorship</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {job.swedish === null ? (
                      <Tooltip>
                        <TooltipTrigger>unknown</TooltipTrigger>
                        <TooltipContent>
                          <p>
                            No information about Swedish language requirements
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : job.swedish === "likely" ? (
                      <Tooltip>
                        <TooltipTrigger>likely</TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Not mentioned in the job description, but the job
                            description is in Swedish
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : job.swedish ? (
                      <Tooltip>
                        <TooltipTrigger>Yes</TooltipTrigger>
                        <TooltipContent>
                          <p>Swedish language skills are required</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger>No</TooltipTrigger>
                        <TooltipContent>
                          <p>Swedish language skills are not required</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {job.skills}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default App;
