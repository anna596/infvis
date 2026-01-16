import { createIncomeExploration } from "./income_expl.js";
import { createCorrelationMatrix } from "./corr_matrix.js";
import { createScatterplot } from "./scatterplot.js";



d3.csv("/adult.csv", d => {
    return{
        age: d.age,
        workclass: d.workclass,
        fnlwgt: d.fnlwgt,
        education: d.education,
        education_num: d["education.num"],
        marital_status: d["marital.status"],
        occupation: d.occupation,
        relationship: d.relationship,
        race: d.race,
        sex: d.sex,
        capital_gain: d["capital.gain"],
        capital_loss: d["capital.loss"],
        hours_per_week: d["hours.per.week"],
        native_country: d["native.country"],
        income: d.income
    }
}).then(data => {
    console.log("CSV data loaded successfully");
    //console.log("Data:", data);

    const colors = d3.scaleOrdinal()
        .domain(["<=50K", ">50K"])
        .range(["#5380b6", "#b1d9f6"]);

    createIncomeExploration(data, colors);

// Event-Bus für Hover aus der Matrix → Scatterplot
const dispatcher = d3.dispatch("corrHover");

createCorrelationMatrix(data, dispatcher);
createScatterplot(data, dispatcher, colors);
}).catch(err => {
    console.error("Error loading CSV:", err);
});


