import { SVGProps } from "react";

export const DrawIcon = ({
  ...props
}: JSX.IntrinsicAttributes & SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g>
        <path d="M4.5 21V16.75L17.675 3.6C17.875 3.4 18.1 3.25 18.35 3.15C18.6 3.05 18.85 3 19.1 3C19.3667 3 19.6208 3.05 19.8625 3.15C20.1042 3.25 20.3167 3.4 20.5 3.6L21.9 5C22.1 5.18333 22.25 5.39583 22.35 5.6375C22.45 5.87917 22.5 6.13333 22.5 6.4C22.5 6.65 22.45 6.9 22.35 7.15C22.25 7.4 22.1 7.625 21.9 7.825L8.75 21H4.5ZM6.5 19H7.9L17.725 9.2L17.025 8.475L16.3 7.775L6.5 17.6V19ZM17.025 8.475L16.3 7.775L17.725 9.2L17.025 8.475ZM14.5 21C15.7333 21 16.875 20.6917 17.925 20.075C18.975 19.4583 19.5 18.6 19.5 17.5C19.5 16.9 19.3417 16.3833 19.025 15.95C18.7083 15.5167 18.2833 15.1417 17.75 14.825L16.275 16.3C16.6583 16.4667 16.9583 16.65 17.175 16.85C17.3917 17.05 17.5 17.2667 17.5 17.5C17.5 17.8833 17.1958 18.2292 16.5875 18.5375C15.9792 18.8458 15.2833 19 14.5 19C14.2167 19 13.9792 19.0958 13.7875 19.2875C13.5958 19.4792 13.5 19.7167 13.5 20C13.5 20.2833 13.5958 20.5208 13.7875 20.7125C13.9792 20.9042 14.2167 21 14.5 21ZM5.075 13.35L6.575 11.85C6.24167 11.7167 5.97917 11.5792 5.7875 11.4375C5.59583 11.2958 5.5 11.15 5.5 11C5.5 10.8 5.65 10.6 5.95 10.4C6.25 10.2 6.88333 9.89167 7.85 9.475C9.31667 8.84167 10.2917 8.26667 10.775 7.75C11.2583 7.23333 11.5 6.65 11.5 6C11.5 5.08333 11.1333 4.35417 10.4 3.8125C9.66667 3.27083 8.7 3 7.5 3C6.75 3 6.07917 3.13333 5.4875 3.4C4.89583 3.66667 4.44167 3.99167 4.125 4.375C3.94167 4.59167 3.86667 4.83333 3.9 5.1C3.93333 5.36667 4.05833 5.58333 4.275 5.75C4.49167 5.93333 4.73333 6.00833 5 5.975C5.26667 5.94167 5.49167 5.83333 5.675 5.65C5.90833 5.41667 6.16667 5.25 6.45 5.15C6.73333 5.05 7.08333 5 7.5 5C8.18333 5 8.6875 5.1 9.0125 5.3C9.3375 5.5 9.5 5.73333 9.5 6C9.5 6.23333 9.35417 6.44583 9.0625 6.6375C8.77083 6.82917 8.1 7.16667 7.05 7.65C5.71667 8.23333 4.79167 8.7625 4.275 9.2375C3.75833 9.7125 3.5 10.3 3.5 11C3.5 11.5333 3.64167 11.9875 3.925 12.3625C4.20833 12.7375 4.59167 13.0667 5.075 13.35Z" />
      </g>
    </svg>
  );
};
