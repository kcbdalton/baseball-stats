import { Component, OnInit, OnDestroy,  NgZone, ChangeDetectorRef} from '@angular/core';
import { HttpClient} from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

/* Goals 
2. Hovering over bar charts indicates each teams respective rank for that stat
3. Add pitching stats
4. If no teams are active then all charts disappear (preserve stats chosen)
*/

export class AppComponent implements OnInit, OnDestroy{
  constructor(private httpclient: HttpClient, private ngZone: NgZone, private cdr: ChangeDetectorRef) {
  }
  title='baseball_scraper_app';
  
  displayStatOptions=false;
  displaySlider=false;
  pageLoaded=false;
  
  activeButtons={
    "Divisions": {} as { [key: string]: boolean },
    "Teams": {} as { [key: string]: boolean },
    "pitchingStats": {} as { [key: string]: boolean },
    "battingStats": {} as { [key: string]: boolean },
    "Years": {} as { [key: string]: boolean }
  };
  divisions={
    "AmericanLeague": {
      "East": [
        "Baltimore Orioles",
        "Boston Red Sox",
        "New York Yankees",
        "Tampa Bay Rays",
        "Toronto Blue Jays"
      ],
      "Central": [
        "Chicago White Sox",
        "Cleveland Guardians",
        "Detroit Tigers",
        "Kansas City Royals",
        "Minnesota Twins"
      ],
      "West": [
        "Houston Astros",
        "Los Angeles Angels",
        "Oakland Athletics",
        "Seattle Mariners",
        "Texas Rangers"
      ]
    },
    "NationalLeague": {
      "East": [
        "Atlanta Braves",
        "Miami Marlins",
        "New York Mets",
        "Philadelphia Phillies",
        "Washington Nationals"
      ],
      "Central": [
        "Chicago Cubs",
        "Cincinnati Reds",
        "Milwaukee Brewers",
        "Pittsburgh Pirates",
        "St. Louis Cardinals"
      ],
      "West": [
        "Arizona Diamondbacks",
        "Colorado Rockies",
        "Los Angeles Dodgers",
        "San Diego Padres",
        "San Francisco Giants"
      ]
    }
  };
  yearsData: {[year: string]: any;}={
      "2021": {},
      "2022": {}
    };
  
  chart: any;
  chartData: any;
  activeYear: any;
  currentYearData: any;
  teamNames: any;
  activeTeams: any[]=[];
  activeStats: { pitchingStats: { [key: string]: boolean }; battingStats: { [key: string]: boolean }; } = {
    pitchingStats: {},
    battingStats: {}
  };
  battingStats: any[]=[];
  pitchingStats: any[]=[];
  maxSliderValue: any;
  pointRadius=4;

  ngOnInit(): void {
    this.fetch2021Schedule().subscribe(([teamData, statNames]) => {
      this.yearsData["2021"]=teamData
      this.pitchingStats=statNames.pitchingStats;
      this.battingStats=statNames.battingStats;
      console.log("pitching stat names:", this.pitchingStats)
      console.log("batting stat names:", this.battingStats)
      console.log("2020",teamData)
    });
    this.fetch2022Schedule().subscribe(([teamData, statNames]) => {
      this.yearsData["2022"]=teamData
      this.teamNames=Object.keys(teamData);
      this.pageLoaded=true;
      this.activeYear="2022"
      this.currentYearData=this.yearsData[this.activeYear]
    });
  }
  ngOnDestroy(): void {
    this.destroyChart()
  }
  fetch2022Schedule(): Observable<any[]> {
    return new Observable<any[]>((observer) => {
    this.httpclient.get<any[]>('https://nw00meomfg.execute-api.us-east-2.amazonaws.com/dev/2022-scraper').subscribe(result => {
      const [teamData, statNames]=result;
      observer.next([teamData, statNames]);
      observer.complete();
    })})
  }
  fetch2021Schedule(): Observable<any[]> {
    return new Observable<any[]>((observer) => {
    this.httpclient.get<any[]>('https://nw00meomfg.execute-api.us-east-2.amazonaws.com/dev/2021-scraper').subscribe(result => {
      const [teamData, statNames]=result;
      observer.next([teamData, statNames]);
      observer.complete();
    })})
  }
  getCheckboxStatus(): void {
    const checkbox=document.getElementById("myCheckbox");
    if (checkbox instanceof HTMLInputElement) {
      if (checkbox.checked) {
        this.activeYear="2022"
      } else {
        this.activeYear="2021"
      }
      for (let button in this.activeButtons["Teams"]) {
        this.activeButtons["Teams"][button]=false;
      }
      this.activeTeams=[];
      this.currentYearData=this.yearsData[this.activeYear]
    }
  }

  toggleButton(target: EventTarget | null, subclass: "Divisions"| "Teams" | "pitchingStats"| "battingStats"): void {
    if (target instanceof HTMLElement) {

      if (subclass==="Teams") {
        const buttonId=target.id;
        this.activeButtons[subclass][buttonId]=!this.activeButtons[subclass]?.[buttonId];
        this.handleTeams()
      } else if (subclass==="pitchingStats" || subclass==="battingStats") {
        if (target.parentElement){
          const buttonId=target.id;
          this.activeButtons[subclass][buttonId]=!this.activeButtons[subclass]?.[buttonId];
          this.handleStats(subclass)
        }
      }
      if (subclass==="Divisions") {
        if (target.parentElement){
          const divisionId=target.parentElement.id
          this.activeButtons[subclass][divisionId]=!this.activeButtons[subclass]?.[divisionId];
          this.handleDivision(divisionId)
        }
      }
    }
  this.updateCharts()
  }
  handleTeams(): void {
    const buttonContainer=document.querySelector(".teams-dropdown-content")
    const buttons=buttonContainer?.querySelectorAll("button") 
    buttons?.forEach((button) => {
      const team=this.currentYearData[button.id];
      if (this.activeButtons["Teams"][button.id] && !this.activeTeams.includes(team)) {
          this.activeTeams.push(team);
          this.addLine()
      } else if (!this.activeButtons["Teams"][button.id] && this.activeTeams.includes(team)) {
          const index=this.activeTeams.indexOf(team);
          if (index !== -1) {
            this.activeTeams.splice(index, 1);
            this.removeLine()
        }
      }
    });
    console.log("handle teams", this.activeTeams)
  }
  handleStats(statCategory: "pitchingStats"| "battingStats"): void {
    const buttonContainer=document.querySelector(`.stats-dropdown-content#${statCategory}`)
    const buttons=buttonContainer?.querySelectorAll("button")
    
    buttons?.forEach((button) => {
      if (this.activeButtons[statCategory][button.id]) {
        if (!this.activeStats[statCategory][button.id]) {
          this.activeStats[statCategory][button.id]=!this.activeStats[statCategory][button.id]
          this.ngZone.run(() => {
            this.cdr.detectChanges();
            this.generateBarCharts(statCategory, button.id);
          });
        }
      } else {
        delete this.activeStats[statCategory][button.id];
        this.removeSmallChart(button.id);
        }
      });

    console.log("current active stats", this.activeStats)
    console.log("current active buttons", this.activeButtons)
  }
  handleDivision(divisionId: string): void {
    const buttonContainer=document.querySelector(`.teams-dropdown-subheader#${divisionId}`)
    const buttons=buttonContainer?.querySelectorAll("button")
    if (this.activeButtons["Divisions"][divisionId]) {
      buttons?.forEach((button) => {
        if (button.id){
          this.activeButtons['Teams'][button.id]=true;
          this.handleTeams()
        }
      });
    } else {
      buttons?.forEach((button) => {
        if (button.id){
          this.activeButtons['Teams'][button.id]=false;
          this.handleTeams()
        }
      });
      this.activeButtons["Divisions"][divisionId]=false;
    }
  }
  switchStatus(event: Event): void {
    console.log("lol doesn't do anything anymore but maybe will one day idk")
  }
  generateChart(): void {
    this.destroyChart();
    this.displayStatOptions=true;
    this.displaySlider=true;

    const canvas: any=document.getElementById("myChart");
    const increment=1;
    let maxGames: any;
    let pointStyle: any;
    if (this.activeYear==="2021") {
      pointStyle="circle";
    } else if (this.activeYear==="2022") {
      pointStyle="triangle";
    } 
    
    if (!this.maxSliderValue) {
      maxGames=162;
    } else {
      maxGames=this.maxSliderValue;
    }
    const labels=Array.from({length: Math.ceil(maxGames / increment) }, (_, index) => (index * increment).toString());
    
    this.chartData={
      labels: labels,
      datasets: [
        ...this.activeTeams.map((team, index) => ({
          label: team.name + ` (${this.activeYear})`,
          data: team.netRecord,
          backgroundColor: team.mainColor,
          borderColor: team.secondaryColor,
          borderWidth: 2,
          pointRadius: this.pointRadius,
          pointStyle: pointStyle
        }))
      ]
    };
    this.chart=new Chart(canvas, {
      type: 'line',
      data: this.chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: false
            }
          },
          x: {
            beginAtZero: true,
            grid: {
              display: false
            }
          }
        },
        interaction: {
          intersect: true,
          mode: 'index'
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function(context) {
                this.title=["Game"+ `${context.dataIndex + 1}`];
                let label=context.dataset.label || '';
                let wins=0;
                let losses=0;
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  const dataIndex=context.dataIndex;
                  const winLoss: any=context.dataset.data;
                  for (let i=0; i<=dataIndex; i++) {
                    const value: any=winLoss[i];
                    if (value > winLoss[i-1]) {
                      wins+=1;
                    } else {
                      losses+=1;
                    }
                  }
                  label+=`${wins}-${losses}`;
                }
                return label;
              }
            }
          },
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true
            }
          }
        },
      }
    });
  }
  generateBarCharts(statCategory: "pitchingStats"| "battingStats", stat: string): void {
    const canvas: any=document.getElementById(statCategory+ "-" + stat +"-Chart")
    console.log(canvas)
    console.log("active stats when entering bar chart function: ", this.activeStats)
    console.log(this.activeTeams)
    const chartData={
      labels: ["Teams"],
      datasets: [
        ...this.activeTeams.map((team, index) => ({
          label: team.name,
          data: [team[statCategory][stat]],
          backgroundColor: team.mainColor,
          borderColor: team.secondaryColor,
          borderWidth: 2
        }))
      ]
    };
    console.log(chartData)
    new Chart(canvas, {
      type: 'bar',
      data: chartData,
      options: {
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              display: false
            }
          },
          x: {
            display: false,
            beginAtZero: true,
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false,
            position: 'top'
          },
          title: {
            display: true,
            text: stat,
            position: 'left'
          },
          datalabels: {
            anchor: 'center',
            align: 'center',
            font: {
              weight: 'bold'
            },
            color: '#ffffff', // Customize the label text color
            formatter: function(value: any, context: any) {
              const datasetIndex=context.datasetIndex;
              const teamName=chartData.datasets[datasetIndex].label;
              const shortenedName: string=teamName.split(' ').pop();
              let formattedValue: string;
              if (value<1) {
                formattedValue=value.toFixed(3);
              } else {
                formattedValue=value.toFixed(0);
              }
              
              return [shortenedName, formattedValue];
            },
            textAlign: 'center'
          }
        }
      },
      plugins: [ChartDataLabels]
    });
  }
  updateCharts(): void {
    // this.activeStats.forEach((stat) => {
    //   const canvas: any=document.getElementById(stat + "Chart");
    //   const existingChart=Chart.getChart(canvas);
    //   if (existingChart) {
    //     existingChart.destroy();
    //   }
    //   this.generateBarCharts(stat)
    // });
  }
  updateSliderValue(): void {
    const maxSlider=document.getElementById("maxSlider") as HTMLInputElement;
    this.maxSliderValue=maxSlider.value
    this.generateChart()
  }
  resetTeamsandChart(keepStats: boolean): void {
    this.displayStatOptions=keepStats;
    this.displaySlider=false;
    this.activeButtons={
      "Divisions": {} as { [key: string]: boolean },
      "Teams": {} as { [key: string]: boolean },
      "pitchingStats": {} as { [key: string]: boolean },
      "battingStats": {} as { [key: string]: boolean },
      "Years": {} as { [key: string]: boolean }
    };
    this.activeTeams=[];
    // for (let stat of this.activeStats) {
    //   this.removeSmallChart(stat)
    // };
    
    // this.activeStats=[];
    this.destroyChart();
  }
  addLine(): void {
    if (this.chartData) {
      const newTeamIndex=this.activeTeams.length - 1;
      let pointStyle: any;
      if (this.activeYear==="2021") {
        pointStyle="circle";
      } else if (this.activeYear==="2022") {
        pointStyle="triangle";
      }
      const newDataset={
        label: this.activeTeams[newTeamIndex].name  + ` (${this.activeYear})`,
        data: this.activeTeams[newTeamIndex].netRecord,
        backgroundColor: this.activeTeams[newTeamIndex].mainColor,
        borderColor: this.activeTeams[newTeamIndex].secondaryColor,
        borderWidth: 2,
        pointRadius: this.pointRadius,
        pointStyle: pointStyle
      };
        this.chartData.datasets.push(newDataset);
        this.chart.data=this.chartData;
        this.chart.update();
    } else {
      this.generateChart()
    }
  }
  removeLine(): void {
    this.chartData.datasets=this.chartData.datasets.filter((dataset: any) => {
      if (!this.activeTeams.some((team: any) => team.name+ ` (${this.activeYear})`===dataset.label)) {
        return false;
      }
      return true; 
    });
    this.chart.update();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
  private removeSmallChart(stat: string): void {
    const canvas: any=document.getElementById(stat + "Chart");
    if (canvas) {
      canvas.remove();
    }
  }
}