import React, { Component } from 'react';
// import logo from './logo.svg';
import PAGES from './common/pagenames.js';
import MyHeader from './common/myheader.js';
import MyFooter from './common/myfooter.js';
import HomePage from './body/home.js';
import AboutPage from './body/about.js';
import DocumentationPage from './body/documentation.js';
import ConfigPDB2PQR from './body/configpdb2pqr.js';
import ConfigAPBS from './body/configapbs.js';
import JobStatus from './body/jobstatus.js';
import './App.css';
import 'antd/dist/antd.css';

import { Layout, Breadcrumb, Col, Row } from 'antd';
import DownloadPage from './body/cli-download.js';
import { hasMeasurementId, hasAnalyticsId, sendPageView } from './body/utils/ga-utils'
import Announcement from './common/announcement.js';
// import { Layout, Col, Menu, Icon, Tooltip, Alert } from 'antd';
// const { Header, Content, Sider, Footer } = Layout;
const { Header } = Layout;

/**
 * Main application code.
 * The page displayed to the user is dependent on the state of the current page.
 * The current page is determined through the React Router, implemented in router.js
 */
class App extends Component {
  constructor(props){
      super(props);
      this.onClickSelectPage = this.onClickSelectPage.bind(this);
      // this.submenuOnClick = this.submenuOnClick.bind(this);
      // this.handleJobSubmit = this.handleJobSubmit.bind(this);
      this.state = {
        cur_page: this.props.page,  // Current page
        job_submit: false,          // Maintains if user tries clicking the Start Job button again
        // openSubmenus: {},           // Currently open submenus
        announcement_drawer_open: false,
      };
      
      if( hasMeasurementId() ){
        sendPageView()
      }
  }

  toggleAnnouncementDrawer(open){
    this.setState({announcement_drawer_open: open})
  }

  /** 
   * onClick handler for user selecting a page. Is passed into child componenets
   */
  onClickSelectPage(selected_page){
    this.setState({
        cur_page: selected_page
    })
  }


  /** Builds Breadcrumb component
   * @param {array} items - list containing the desired items for the breadcrumb
   */
  createServiceBreadcrumb(items){
    let trail = [];
    let itemNum = 0;
    items.forEach(function(value){
      itemNum += 1;
      // console.log(k)
      if(itemNum != items.length){
        trail.push(<Breadcrumb.Item >{value}</Breadcrumb.Item>)
      }
      else{
        trail.push(<Breadcrumb.Item><b>{value}</b></Breadcrumb.Item>)
      }
    });    
    return(
      <Breadcrumb style={{ margin: '16px 0' }}>
        {trail}
        {/* <Breadcrumb.Item>Services</Breadcrumb.Item>
        <Breadcrumb.Item>{tail}</Breadcrumb.Item> */}
      </Breadcrumb>      
    )
  }

  render() {
    let navbar_options = new Map();
    let content = "";
    let bcrumb = "";

    navbar_options.set("navbar_home",    "Home");
    navbar_options.set("navbar_pdb2pqr", "PDB2PQR");
    navbar_options.set("navbar_apbs",    "APBS");
    navbar_options.set("navbar_about",   "About");

    const current_page = this.props.page

    // HOME page
    // Renders landing page, with choice to do PDB2PQR or APBS
    if (current_page === PAGES.home || current_page === null){
      document.title = "APBS | Home";
      bcrumb = this.createServiceBreadcrumb(['Home'])
      content = <HomePage />;
    }
    
    // ABOUT page
    // Renders the about page
    else if (current_page === PAGES.about){
      document.title = "APBS | About";
      bcrumb = this.createServiceBreadcrumb(['About'])
      content = <AboutPage />;
    }

    // DOCUMENTATION page
    // Renders the documentation page
    // Directs user to the APBS-PDB2PQR documentation
    else if (current_page === PAGES.documentation){
      document.title = "APBS | Documentation";
      bcrumb = this.createServiceBreadcrumb(['Documentation'])
      content = <DocumentationPage />;
    }

    // DOWNLOAD page
    // Renders the CLI download page
    // Directs user to the APBS-PDB2PQR download page
    else if (current_page === PAGES.download){
      document.title = "APBS | Downloads";
      bcrumb = this.createServiceBreadcrumb(['Downloads'])
      content = <DownloadPage />;
    }

    // PDB2PQR page
    // Renders configuration elements to set up an PDB2PQR job
    else if (current_page === PAGES.pdb2pqr){
      let query_args = new URLSearchParams(this.props.query)
      let show_cli_args = query_args.get('show_cli')

      document.title = "Tools | Configure a PDB2PQR job";
      bcrumb = this.createServiceBreadcrumb(['Tools', 'PDB2PQR Job Configuration'])
      content = <ConfigPDB2PQR show_cli={show_cli_args}/>;
    }
    
    // APBS page
    // Renders configuration elements to set up an APBS job
    else if (current_page === PAGES.apbs){
      let query_args = new URLSearchParams(this.props.query)
      let job_id = query_args.get('jobid')
      let job_date = query_args.get('date')

      document.title = "Tools | Configure a APBS job";
      bcrumb = this.createServiceBreadcrumb(['Tools', 'APBS Job Configuration'])
      content = <ConfigAPBS jobid={job_id} jobdate={job_date}/>;
    }

    // JOB STATUS page
    // Renders job status page
    else if (current_page === PAGES.status){
      let query_args = new URLSearchParams(this.props.query)
      let job_id = query_args.get('jobid')
      let job_type = query_args.get('jobtype')
      let job_date = query_args.get('date')

      document.title = `Job Status - ${job_id}`;
      bcrumb = this.createServiceBreadcrumb(['Tools', 'Job Status', job_id])
      content = 
        <JobStatus
          jobid={job_id}
          jobtype={job_type}
          jobdate={job_date}
        />;
    }


    return(
      <Layout style={{ height: '100%' }}>
        <Announcement open={this.state.announcement_drawer_open} toggleDrawer={open => this.toggleAnnouncementDrawer(open)}/>
        <MyHeader
          activeItem={current_page}
          navbar_items={navbar_options}
          all_header_items={new Array()}
          onClick={j => this.onClickSelectPage(j)}

          //
          isMenuCollapsed={this.props.isMenuCollapsed}
          openSubmenus={Object.values(this.props.openSubmenus)}
          submenuOnClick={k => this.props.submenuOnClick(k)}
          onSiderCollapse={(isCollapsed, type) => this.props.onSiderCollapse(isCollapsed, type)}
          onAnnounmentClick={() => this.toggleAnnouncementDrawer(true)}
        />
        {/* <Header style={{ background: '#fff', paddingDown: 16 }} /> */}
        <Layout style={{ padding: '0px 50px' }}>
          {/* <Row> */}
          {bcrumb}
          {content}
          {/* </Row> */}
          <MyFooter />
        </Layout>
      </Layout>

    )

  }
}

export default App;
