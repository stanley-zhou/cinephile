import { useState, useEffect } from 'react'
import './App.css'

const API_BASE = 'http://localhost:3001'

function App() {
  const [activeView, setActiveView] = useState('popular')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [selectedMovie, setSelectedMovie] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [knownForName, setKnownForName] = useState('')
  const [countrySort, setCountrySort] = useState('rating')
  const [exploreSearch, setExploreSearch] = useState('')
  const [exploreSort, setExploreSort] = useState('rating_desc')
  const [explorePage, setExplorePage] = useState(1)
  const [explorePageSize, setExplorePageSize] = useState(25)
  const [exploreTotal, setExploreTotal] = useState(0)
  const startIdx = (explorePage - 1) * explorePageSize + 1;
  const endIdx = Math.min(explorePage * explorePageSize, exploreTotal);
  const isSortedCol = (column) => exploreSort.split('_')[0] === column;


  useEffect(() => {
    // Don't auto-fetch for views that require a search parameter
    if (activeView === 'movie-genres' || activeView === 'person-known-for') {
      return
    }
    fetchData(activeView)
  }, [activeView])

  useEffect(() => {
    // When sort option changes while viewing Country Spotlight, refetch with new sort
    if (activeView === 'country-stats') {
      fetchData('country-stats')
    }
  }, [countrySort, activeView])

  useEffect(() => {
    // Refetch when explore controls change
    if (activeView === 'movies-explore') {
      fetchData('movies-explore')
    }
  }, [activeView, exploreSort, explorePage, explorePageSize])




  const fetchData = async (view, param = '') => {
    setLoading(true)
    try {
      let url = ''
      switch (view) {
        case 'popular':
          url = `${API_BASE}/movies/popular/high-rated`
          break
        case 'genres':
          url = `${API_BASE}/genres/stats/ratings`
          break
        case 'directors':
          url = `${API_BASE}/directors/above-average`
          break
        case 'actors':
          url = `${API_BASE}/actors/prolific`
          break
        case 'pairs':
          url = `${API_BASE}/actors/frequent-pairs`
          break
        case 'decades':
          url = `${API_BASE}/movies/best-per-decade`
          break
        case 'hidden-gems':
          url = `${API_BASE}/movies/hidden-gems`
          break
        case 'high-rated-people':
          url = `${API_BASE}/people/high-rated-knownfor`
          break
        case 'high-budget-low-rating':
          url = `${API_BASE}/analytics/high-budget-low-rating`
          break
        case 'movie-genres':
          url = `${API_BASE}/movies/${encodeURIComponent(param)}/genres`
          break
        case 'person-known-for':
          url = `${API_BASE}/people/${encodeURIComponent(param)}/known-for`
          break
        case 'high-roi':
          url = `${API_BASE}/analytics/high-roi-movies`
          break
        case 'country-stats':
          url = `${API_BASE}/analytics/country-stats?sort=${countrySort}`
          break
        case 'movies-explore': {
          const params = new URLSearchParams({
            search: exploreSearch.trim(),
            sort: exploreSort,
            limit: String(explorePageSize),
            offset: String((explorePage - 1) * explorePageSize),
          })
          url = `${API_BASE}/movies/explore?${params.toString()}`
          break
        }
        default:
          url = `${API_BASE}/movies/popular/high-rated`
      }

      const response = await fetch(url)
      const result = await response.json()

      if (view === 'movies-explore') {
        // Accept BOTH shapes:
        // 1) [ {...}, {...} ]   (plain array)
        // 2) { rows: [...], total: 1234 }
        if (Array.isArray(result)) {
          setData(result)
          setExploreTotal(result.length)
        } else {
          const rows = Array.isArray(result.rows) ? result.rows : []
          const total =
            typeof result.total === 'number' ? result.total : rows.length

          setData(rows)
          setExploreTotal(total)
        }
      } else {
        setData(result)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      setData([])
    } finally {
      setLoading(false)
    }
  }


  const handleSearch = (view) => {
    const term = searchInput.trim()
    if (!term) return

    if (view === 'person-known-for') {
      setKnownForName(term)
    }

    setActiveView(view)
    fetchData(view, term)
  }


  const openKnownForFromPeople = (personName) => {
    setKnownForName(personName)            
    setActiveView('person-known-for')
    fetchData('person-known-for', personName)
  }


  const openMovieDetails = async (movieId) => {
  setDetailsLoading(true)
  setDetailsError('')

  try {
    const response = await fetch(`${API_BASE}/movies/${encodeURIComponent(movieId)}/details`)
    if (!response.ok) {
      throw new Error('Failed to fetch movie details')
    }
    const result = await response.json()
    setSelectedMovie(result)
  } catch (err) {
    console.error('Error fetching movie details:', err)
    setDetailsError('Could not load movie details')
  } finally {
    setDetailsLoading(false)
  }
  }

  const handleMovieCardClick = (movieId) => {
    const selection = window.getSelection()
    // If user is selecting text (non-empty selection), do nothing
    if (selection && selection.toString().length > 0) {
      return
    }
    openMovieDetails(movieId)
  }


  const closeMovieDetails = () => {
    setSelectedMovie(null)
    setDetailsError('')
  }

  const handleExploreSort = (column, defaultDir = 'desc') => {
    setExplorePage(1)
    setExploreSort((prev) => {
      const [prevCol, prevDir] = prev.split('_')
      if (prevCol !== column) {
        // first time you click this column
        return `${column}_${defaultDir}`
      }
      // toggle asc/desc if you click again
      return prevDir === 'desc'
        ? `${column}_asc`
        : `${column}_desc`
    })
  }

  const renderSortIcon = (column) => {
    const [col, dir] = exploreSort.split('_')
    if (col !== column) return '↕'   // inactive
    return dir === 'desc' ? '↓' : '↑'
  }


  const renderContent = () => {
    if (loading) {
      return <div className="loader">Loading...</div>
    }

    if (!data || data.length === 0) {
      // For the explore table we still want to render the table UI,
      // even if there are 0 matching movies.
      if (activeView !== 'movies-explore') {
        return <div className="empty-state">No data found</div>
      }
    }

    switch(activeView) {
      case 'popular':
      return (
        <div className="movie-grid">
          {data.map((movie, idx) => (
            <div
              key={movie.movie_id}
              className="movie-card"
              style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
              onClick={() => handleMovieCardClick(movie.movie_id)}
            >
              <div className="movie-rank">#{idx + 1}</div>
              <h3 className="movie-title">{movie.title}</h3>
              <div className="movie-meta">
                <span className="year">{movie.release_year}</span>
                <span className="rating">★ {movie.rating}</span>
              </div>
              <div className="votes">{movie.num_votes.toLocaleString()} votes</div>
            </div>
          ))}
        </div>
      )


      case 'genres':
        return (
          <div className="stats-grid">
            {data.map((genre, idx) => (
              <div key={genre.genre_name} className="stat-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <h3 className="stat-title">{genre.genre_name}</h3>
                <div className="stat-value">★ {parseFloat(genre.avg_rating).toFixed(2)}</div>
                <div className="stat-meta">{genre.num_movies} movies</div>
              </div>
            ))}
          </div>
        )

      case 'directors':
        return (
          <div className="person-list">
            {data.map((director, idx) => (
              <div
                key={director.person_id}
                className="person-item"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => openKnownForFromPeople(director.name)}
              >
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{director.name}</h3>
                  <div className="person-stats">
                    <span>{director.num_directed_popular_movies} films</span>
                    <span>★ {parseFloat(director.director_avg_rating).toFixed(2)} avg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'actors':
        return (
          <div className="person-list">
            {data.map((actor, idx) => (
              <div
                key={actor.person_id}
                className="person-item"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => openKnownForFromPeople(actor.name)}
              >
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{actor.name}</h3>
                  <div className="person-stats">
                    <span>{actor.num_acting_roles} roles</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'pairs':
        return (
          <div className="pairs-grid">
            {data.map((pair, idx) => (
              <div key={`${pair.actor1_id}-${pair.actor2_id}`} className="pair-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="pair-names">
                  <div className="actor-name">{pair.actor1_name}</div>
                  <div className="pair-connector">×</div>
                  <div className="actor-name">{pair.actor2_name}</div>
                </div>
                <div className="pair-count">{pair.num_movies_together} films together</div>
              </div>
            ))}
          </div>
        )

      case 'decades':
        return (
          <div className="decade-timeline">
            {data.map((movie, idx) => (
              <div
                key={movie.movie_id}
                className="decade-item"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => handleMovieCardClick(movie.movie_id)}
              >
                <div className="decade-year">{movie.decade_start_year}s</div>
                <div className="decade-content">
                  <h3 className="movie-title">{movie.title}</h3>
                  <div className="movie-meta">
                    <span className="rating">★ {movie.rating}</span>
                    <span className="votes">{movie.num_votes.toLocaleString()} votes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'hidden-gems':
        return (
          <div className="movie-grid">
            {data.map((movie, idx) => (
              <div
                key={movie.movie_id}
                className="movie-card"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => handleMovieCardClick(movie.movie_id)}
              >
                <h3 className="movie-title">{movie.title}</h3>
                <div className="movie-meta">
                  <span className="year">{movie.release_year}</span>
                  <span className="rating">★ {movie.rating}</span>
                </div>
                <div className="votes">
                  {movie.num_votes.toLocaleString()} votes
                </div>
              </div>
            ))}
          </div>
        )

      case 'high-rated-people':
        return (
          <div className="person-list">
            {data.map((person, idx) => (
              <div
                key={person.person_id}
                className="person-item"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => openKnownForFromPeople(person.name)}
              >
                <div className="person-rank">{idx + 1}</div>
                <div className="person-info">
                  <h3 className="person-name">{person.name}</h3>
                  <div className="person-stats">
                    <span>
                      {person.num_known_for} known-for movies,&nbsp;
                      avg ★ {parseFloat(person.avg_rating).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )

      case 'high-budget-low-rating':
        return (
          <div className="analytics-grid">
            {data.map((movie, idx) => (
              <div
                key={movie.movie_id}
                className="analytics-card"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => handleMovieCardClick(movie.movie_id)}
              >
                <h3 className="movie-title">{movie.title}</h3>
                <div className="analytics-details">
                  <div className="detail-row">
                    <span>Year:</span>
                    <span>{movie.release_year}</span>
                  </div>
                  <div className="detail-row">
                    <span>Rating:</span>
                    <span className="rating-low">★ {movie.imdb_rating}</span>
                  </div>
                  <div className="detail-row">
                    <span>Budget:</span>
                    <span>${(movie.budget / 1_000_000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row">
                    <span>Revenue:</span>
                    <span>${(movie.revenue / 1_000_000).toFixed(0)}M</span>
                  </div>
                  <div className="detail-row profit-row">
                    <span>Profit:</span>
                    <span className={movie.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                      ${(movie.profit / 1_000_000).toFixed(0)}M
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )


      case 'high-roi':
        return (
          <div className="analytics-grid">
            {data.map((movie, idx) => (
              <div
                key={movie.movie_id}
                className="analytics-card"
                style={{ animationDelay: `${idx * 0.05}s`, cursor: 'pointer' }}
                onClick={() => handleMovieCardClick(movie.movie_id)}
              >
                <h3 className="movie-title">{movie.title}</h3>
                <div className="analytics-details">
                  <div className="detail-row">
                    <span>Year:</span>
                    <span>{movie.release_year}</span>
                  </div>
                  <div className="detail-row">
                    <span>Rating:</span>
                    <span className="rating">★ {movie.imdb_rating}</span>
                  </div>
                  <div className="detail-row">
                    <span>Budget:</span>
                    <span>${(movie.budget / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="detail-row">
                    <span>Revenue:</span>
                    <span>${(movie.revenue / 1_000_000).toFixed(1)}M</span>
                  </div>
                  <div className="detail-row roi-row">
                    <span>ROI:</span>
                    <span className="roi-value">{(movie.roi * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )


      case 'movie-genres':
        return (
          <div className="search-results">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="result-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {item.genre_name && <div className="genre-badge">{item.genre_name}</div>}
                {item.title && (
                  <>
                    <h3 className="movie-title">{item.title}</h3>
                    <div className="movie-meta">
                      {item.rating && <span className="rating">★ {item.rating}</span>}
                      {item.num_votes && (
                        <span>{item.num_votes.toLocaleString()} votes</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )

      case 'person-known-for':
        return (
          <div className="search-results">
            {knownForName && (
              <h2 className="section-title">Filmography Highlights – {knownForName}</h2>
            )}
            {data.map((item, idx) => (
              <div
                key={idx}
                className="result-item"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {item.title && (
                  <>
                    <h3 className="movie-title">{item.title}</h3>
                    <div className="movie-meta">
                      {item.rating && <span className="rating">★ {item.rating}</span>}
                      {item.num_votes && (
                        <span>{item.num_votes.toLocaleString()} votes</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      
      case 'country-stats':
        return (
          <div>
            <div className="country-sort-bar">
              <label className="country-sort-label">
                Sort by:&nbsp;
                <select
                  value={countrySort}
                  onChange={(e) => setCountrySort(e.target.value)}
                >
                  <option value="rating">Avg Rating</option>
                  <option value="revenue">Total Revenue</option>
                  <option value="roi">Avg ROI</option>
                  <option value="movies"># Movies</option>
                </select>
              </label>
            </div>

            <div className="analytics-grid">
              {data.map((country, idx) => {
                const avgRating = country.avg_rating
                  ? parseFloat(country.avg_rating).toFixed(2)
                  : 'N/A'

                const totalRevenue = country.total_revenue
                  ? Number(country.total_revenue)
                  : 0

                let revenueLabel = 'N/A'
                if (totalRevenue > 0) {
                  if (totalRevenue >= 1_000_000_000) {
                    revenueLabel = `$${(totalRevenue / 1_000_000_000).toFixed(1)}B`
                  } else {
                    revenueLabel = `$${(totalRevenue / 1_000_000).toFixed(1)}M`
                  }
                }

                const avgRoi = country.avg_roi
                  ? (parseFloat(country.avg_roi) * 100).toFixed(0) + '%'
                  : 'N/A'

                return (
                  <div
                    key={country.country_name}
                    className="analytics-card"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    <h3 className="movie-title">{country.country_name}</h3>

                    <div className="analytics-details">
                      <div className="detail-row">
                        <span>Films:</span>
                        <span>{country.num_movies}</span>
                      </div>
                      <div className="detail-row">
                        <span>Avg Rating:</span>
                        <span>★ {avgRating}</span>
                      </div>
                      <div className="detail-row">
                        <span>Total Revenue:</span>
                        <span>{revenueLabel}</span>
                      </div>
                      <div className="detail-row roi-row">
                        <span>Avg ROI:</span>
                        <span className="roi-value">{avgRoi}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      
       case 'movies-explore': {
        // how many pages in total (assumes exploreTotal is from backend)
        const totalPages = Math.max(
          1,
          Math.ceil(exploreTotal / explorePageSize)
        )

        return (
          <div className="explore-container">
            {/* TOP: only search bar + button */}
            <div className="explore-controls">
              <input
                type="text"
                className="search-input"
                placeholder="Search title..."
                value={exploreSearch}
                onChange={(e) => setExploreSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setExplorePage(1)
                    fetchData('movies-explore')
                  }
                }}
              />
              <button
                className="search-btn"
                onClick={() => {
                  setExplorePage(1)
                  fetchData('movies-explore')
                }}
              >
                Search
              </button>
            </div>

            {/* TABLE */}
            <div className="explore-table-wrapper">
              <table className="explore-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th
                      className={`sortable ${isSortedCol('year') ? 'sorted' : ''}`}
                      onClick={() => handleExploreSort('year', 'desc')}
                    >
                      Year{' '}
                      <span className="sort-icon">
                        {renderSortIcon('year')}
                      </span>
                    </th>
                    <th>Genres</th>
                    <th
                      className={`sortable ${isSortedCol('runtime') ? 'sorted' : ''}`}
                      onClick={() => handleExploreSort('runtime', 'desc')}
                    >
                      Runtime (mins){' '}
                      <span className="sort-icon">
                        {renderSortIcon('runtime')}
                      </span>
                    </th>
                    <th
                      className={`sortable ${isSortedCol('raing') ? 'sorted' : ''}`}
                      onClick={() => handleExploreSort('rating', 'desc')}
                    >
                      Rating{' '}
                      <span className="sort-icon">
                        {renderSortIcon('rating')}
                      </span>
                    </th>
                    <th
                      className={`sortable ${isSortedCol('votes') ? 'sorted' : ''}`}
                      onClick={() => handleExploreSort('votes', 'desc')}
                    >
                      Votes{' '}
                      <span className="sort-icon">
                        {renderSortIcon('votes')}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((movie) => {
                    const genres = Array.isArray(movie.genres)
                      ? movie.genres.join(', ')
                      : movie.genres || '';

                    const runtime =
                      movie.runtime_minutes && movie.runtime_minutes > 0
                        ? movie.runtime_minutes
                        : null;

                    const hasRating =
                      movie.rating !== null && movie.rating !== undefined;

                    const hasVotes =
                      movie.num_votes !== null &&
                      movie.num_votes !== undefined &&
                      movie.num_votes > 0;

                    return (
                      <tr
                        key={movie.movie_id}
                        className="explore-row"
                        onClick={() => handleMovieCardClick(movie.movie_id)}
                      >
                        <td>{movie.title}</td>
                        <td>{movie.release_year ?? '-'}</td>
                        <td>{genres || '-'}</td>
                        <td>{runtime !== null ? runtime : '-'}</td>
                        <td>
                          {hasRating ? (
                            <>
                              ★ {Number(movie.rating).toFixed(1)}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td>{hasVotes ? movie.num_votes.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* BOTTOM: rows-per-page + page info + Prev/Next */}
            <div className="explore-pagination">
              <div className="pagination-left">
                <label className="pagination-page-size">
                  Rows per page:&nbsp;
                  <select
                    className="explore-select"
                    value={explorePageSize}
                    onChange={(e) => {
                      setExplorePageSize(Number(e.target.value))
                      setExplorePage(1)
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="pagination-center">
                <span className="pagination-info">
                  Showing {startIdx}–{endIdx} of {exploreTotal} movies
                </span>
              </div>
              <div className="pagination-right">
                <button
                  className="nav-btn"
                  disabled={explorePage <= 1}
                  onClick={() =>
                    setExplorePage((p) => Math.max(p - 1, 1))
                  }
                >
                  Prev
                </button>
                <button
                  className="nav-btn"
                  disabled={explorePage >= totalPages}
                  onClick={() =>
                    setExplorePage((p) => Math.min(p + 1, totalPages))
                  }
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )
      }

  

      default:
        return null
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">CINEPHILE</h1>
          <p className="tagline">Explore the World of Cinema</p>
        </div>
      </header>

      <nav className="nav">
        <div className="nav-section">
          <div className="nav-label">Discover</div>
          <button 
            className={activeView === 'popular' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('popular')}
          >
            Top Rated
          </button>
          <button 
            className={activeView === 'decades' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('decades')}
          >
            Best by Decade
          </button>
          <button 
            className={activeView === 'hidden-gems' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('hidden-gems')}
          >
            Hidden Gems
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">People</div>
          <button 
            className={activeView === 'directors' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('directors')}
          >
            Elite Directors
          </button>
          <button 
            className={activeView === 'actors' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('actors')}
          >
            Prolific Actors
          </button>
          <button 
            className={activeView === 'pairs' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('pairs')}
          >
            Dynamic Duos
          </button>
          <button 
            className={activeView === 'high-rated-people' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-rated-people')}
          >
            Perfect Records
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-label">Analytics</div>
          <button 
            className={activeView === 'genres' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('genres')}
          >
            Genre Stats
          </button>
          <button 
            className={activeView === 'high-budget-low-rating' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-budget-low-rating')}
          >
            Big Budget Flops
          </button>
          <button 
            className={activeView === 'high-roi' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('high-roi')}
          >
            Highest ROI
          </button>
          <button 
            className={activeView === 'country-stats' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setActiveView('country-stats')}
          >
            Country Spotlight
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-section">
            <div className="nav-label">Search</div>
            <button
              className={activeView === 'movies-explore' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => {
                // reset pagination when entering this view
                setExplorePage(1)
                setActiveView('movies-explore')  // useEffect will trigger fetch
              }}
            >
              Explore Movies
            </button>
          </div>
        </div>
      </nav>

      <main className="main">
        {renderContent()}
      </main>

      {(selectedMovie || detailsLoading || detailsError) && (
        <div className="movie-modal-backdrop" onClick={closeMovieDetails}>
          <div
            className="movie-modal"
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside
          >
            <button className="movie-modal-close" onClick={closeMovieDetails}>
              ✕
            </button>

            {detailsLoading && !selectedMovie && (
              <div className="movie-modal-loading">Loading movie details...</div>
            )}

            {detailsError && !detailsLoading && !selectedMovie && (
              <div className="movie-modal-error">{detailsError}</div>
            )}

            {selectedMovie && (
              <div className="movie-modal-content">
                <div className="movie-modal-header">
                  <h2>{selectedMovie.title}</h2>
                  <div className="movie-modal-meta">
                    {selectedMovie.release_year && <span>{selectedMovie.release_year}</span>}
                    {selectedMovie.runtime_minutes && (
                      <span>{selectedMovie.runtime_minutes} min</span>
                    )}
                    {selectedMovie.rating && (
                      <span>★ {selectedMovie.rating} ({selectedMovie.num_votes.toLocaleString()} votes)</span>
                    )}
                  </div>
                </div>

                <div className="movie-modal-body">
                  {selectedMovie.poster_path && (
                    <div className="movie-modal-poster">
                      {/* simple TMDb image test – if you want to try it */}
                      <img
                        src={`https://image.tmdb.org/t/p/w300${selectedMovie.poster_path}`}
                        alt={selectedMovie.title}
                      />
                    </div>
                  )}

                  <div className="movie-modal-info">
                    {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Genres</h4>
                        <div className="movie-modal-tags">
                          {selectedMovie.genres.map((g) => (
                            <span key={g} className="movie-tag">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedMovie.countries && selectedMovie.countries.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Production Countries</h4>
                        <p>{selectedMovie.countries.join(', ')}</p>
                      </div>
                    )}

                    {selectedMovie.directors && selectedMovie.directors.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Director{selectedMovie.directors.length > 1 ? 's' : ''}</h4>
                        <p>{selectedMovie.directors.join(', ')}</p>
                      </div>
                    )}

                    {selectedMovie.cast && selectedMovie.cast.length > 0 && (
                      <div className="movie-modal-section">
                        <h4>Top Cast</h4>
                        <p>{selectedMovie.cast.join(', ')}</p>
                      </div>
                    )}

                    {selectedMovie.overview && (
                      <div className="movie-modal-section">
                        <h4>Overview</h4>
                        <p>{selectedMovie.overview}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App