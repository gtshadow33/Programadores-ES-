
const activityList = document.getElementById("activity-list");
console.log(document.location.pathname);

const iconPath = new URL(
    "./assets/icons.svg",
    document.baseURI
);

console.log("Document location:", document.location.href);
console.log("Document base URI:", document.baseURI);
console.log("SVG resolved path:", iconPath.href);

fetch(iconPath.href)
    .then(response => {
        console.log("Response status:", response.status);
        console.log("SVG found:", response.ok);

        if (!response.ok) {
            throw new Error("SVG could not be loaded");
        }
        
        return response.text();
    })
    .then(text => {
        console.log("SVG loaded successfully");
        console.log(
            "Contains reload:",
            text.includes('id="reload"')
        );
    })
    .catch(error => {
        console.error("SVG ERROR:", error);
    });


const factoryActivity = (activity_str, time_str) => {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const container = document.createElement("div");
    container.className = "flex items-center justify-between pb-3 pt-3 last:pb-0";
    
    const leftSection = document.createElement("div");
    leftSection.className = "flex items-center gap-x-3 text-gray-600"

    const svgIcon = document.createElementNS(SVG_NS, "svg");
    svgIcon.setAttribute("class", "size-8");

    const icon = document.createElementNS(SVG_NS, "use");

    const iconUrl = new URL(
        "./assets/icons.svg",
        document.baseURI
    ).href;

    icon.setAttribute("href", `${iconUrl}#reload`);

    svgIcon.append(icon);

    const details = document.createElement("div");

    const activityProject = document.createElement("h6");
    activityProject.className = "text-slate-800 font-semibold";
    activityProject.textContent = activity_str;
    
    const formattedTime = document.createElement("p");
    formattedTime.className = "text-slate-600 text-sm";

    details.append(activityProject, formattedTime);

    leftSection.append(svgIcon, details);

    const price = document.createElement("h6");
    price.className = "text-slate-600 font-medium";
    price.textContent = "$421";

    container.append(leftSection, price);

    return container;

}

const elem = factoryActivity("Ramdom activity", "00:06");
activityList.append(elem)