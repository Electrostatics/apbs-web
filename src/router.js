import React, { Component } from 'react';
import ReactGA from 'react-ga';
import {
  BrowserRouter as Router,
  Route,
  Switch,
} from 'react-router-dom'
import App from './App';
import VizLegacyPage from './body/old-viz-layout'
import './App.css';
import 'antd/dist/antd.css';
import PAGES from './common/pagenames.js';
import { hasMeasurementId, hasAnalyticsId, sendPageView } from './body/utils/ga-utils'

  
class ServerRouter extends Component{

    constructor(props){
        super(props)
        this.state = {
            openSubmenus: {},
            isMenuCollapsed: false,
        }
        this.submenuOnClick = this.submenuOnClick.bind(this);
        this.onSiderCollapse = this.onSiderCollapse.bind(this);

        if( hasAnalyticsId() ) 
            ReactGA.initialize(window._env_.GA_TRACKING_ID);
        else
            console.warn('no Google Analytics ID was set')
            
        if( hasMeasurementId() ){
            // this.createAnalytics4Element()
        }else{
            console.warn('no Google Measurement ID was set')
        }
    }

    /**
     * onClick handler for selecting a submenu when using side-menu navigation.
     * Used to ensure that opened submenus remain open when navigating to another page.
     */
    submenuOnClick(submenu_key){
        let submenu_obj = this.state.openSubmenus;

        // If submenu is closing, remove the key from object
        // Otherwise, add the key to the object
        if( Object.keys(submenu_obj).includes(submenu_key) )
            delete submenu_obj[submenu_key];
        else
            submenu_obj[submenu_key] = submenu_key;

        this.setState({ openSubmenus: submenu_obj });
    }

    onSiderCollapse(collapsed, type){
        console.log(collapsed, type)
        let cur_sider_state = this.state.isMenuCollapsed;
        let new_state = null;
        
        if( type === 'clickTrigger' )
            new_state = !cur_sider_state;
        else if (type === 'responsive')
            new_state = cur_sider_state;

        this.setState({ isMenuCollapsed: new_state });
    }

    render(){
        return(
            <Router>
                <div>
                    <Switch>
                        <Route exact path="/"
                            render={ props => (
                                <App
                                    page={PAGES.home}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                />
                            )}                
                        />
                        <Route path="/about"
                            render={ props => (
                                <App
                                    page={PAGES.about}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                />
                            )}
                        />
                        <Route path="/documentation"
                            render={ props => (
                                <App
                                    page={PAGES.documentation}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                />
                            )}
                        />
                        <Route path="/download"
                            render={ props => (
                                <App
                                    page={PAGES.download}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                />
                            )}
                        />
                        <Route path="/pdb2pqr"
                            render={ props => (
                                <App
                                    page={PAGES.pdb2pqr}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                    query={props.location.search}
                                />
                            )}
                        />
                        <Route path="/apbs"
                            render={ props => (
                                <App
                                    page={PAGES.apbs}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                    query={props.location.search}/>
                            )}
                        />
                        <Route path="/jobstatus"
                            render={ props => (
                                <App
                                    page={PAGES.status}
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                    query={props.location.search}/>
                            )}
                        />
                        <Route path="/viz/3dmol"
                            render={ props => (
                                <VizLegacyPage
                                    query={props.location.search}
                                />
                            )}
                        />
                        <Route
                            // 404 page
                            render={ () => (
                                <App
                                    isMenuCollapsed={this.state.isMenuCollapsed}
                                    openSubmenus={this.state.openSubmenus}
                                    submenuOnClick={j => this.submenuOnClick(j)}
                                    onSiderCollapse={(isCollapsed, type) => this.onSiderCollapse(isCollapsed, type)}
                                />
                            )}
                        />
                    </Switch>
                </div>
            </Router>
        )
    }
}

export default ServerRouter