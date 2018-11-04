import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import SwipeableViews from 'react-swipeable-views';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Grid from '@material-ui/core/Grid';

import GithubRepo from "../GithubRepo"
import SearchBar from "../SearchBar"

import githubClient from '../githubClient'

const styles = theme => ({
  root: {
    flexGrow: 1,
    marginTop: 30
  },
  paper: {
    padding: theme.spacing.unit * 2,
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
});

class Home extends React.Component {
  state = {
    value: 0,
    repos: [{id: 1, full_name: 'foo', description: 'lorem....'}],
    kudos: [{id: 2, full_name: 'bar', description: 'lorem....'}]
  };

  handleTabChange = (event, value) => {
    this.setState({ value });
  };

  handleTabChangeIndex = index => {
    this.setState({ value: index });
  };

  resetRepos = repos => this.setState({ ...this.state, repos })

  isKudo = repo => this.state.kudos.includes(repo)
  
  onKudo = (repo) => {
    if (this.state.kudos.find(r => r.id === repo.id)) {
      this.setState({
        ...this.state,
        kudos: this.state.kudos.filter( r => r.id !== repo.id )
      })
    } else {
      this.setState({
        ...this.state,
        kudos: [repo, ...this.state.kudos]
      })
    }
  }

  onSearch = (event) => {
    const target = event.target;
    if (!target.value || target.length < 3) { return }
    if (event.which !== 13) { return }

    githubClient
      .getJSONRepos(target.value)
      .then((response) => {
        target.blur();
        this.setState({ ...this.state, value: 1 });
        this.resetRepos(response.items);
      })
  }
  
  renderRepos = (repos) => {
    return repos.map((repo) => {
      return (
        <Grid item xs={12} md={3} key={repo.id}>
          <GithubRepo onKudo={this.onKudo} isKudo={this.isKudo(repo)} repo={repo} />
        </Grid>
      );
    })
  }

  render() {
    return (
      <div className={styles.root}>
        <SearchBar auth={this.props.auth} onSearch={this.onSearch} />
         <Tabs
          value={this.state.value}
          onChange={this.handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          fullWidth
        >
          <Tab label="Kudos" />
          <Tab label="Search" />
        </Tabs>
        
        <SwipeableViews
          axis={'x-reverse'}
          index={this.state.value}
          onChangeIndex={this.handleTabChangeIndex}
        >
          <Grid container spacing={16} style={{padding: '20px 0'}}>
            { this.renderRepos(this.state.kudos) }
          </Grid>
          <Grid container spacing={16} style={{padding: '20px 0'}}>
            { this.renderRepos(this.state.repos) }
          </Grid>
        </SwipeableViews>
      </div>
    );
  }
}

export default withStyles(styles)(Home);